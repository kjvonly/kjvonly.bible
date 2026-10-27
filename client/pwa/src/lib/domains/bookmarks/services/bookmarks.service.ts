import type { OutboxWakeup } from '$lib/application';
import type { BibleLocationReferenceService } from '$lib/domains/bible';

import {
	assertBookmarkPublisher,
	createBookmarkId,
	parseBookmarkId
} from '../models/bookmark-id';
import type {
	Bookmark,
	BookmarkTarget,
	NormalizedBookmarkDocumentReference
} from '../models/bookmark.model';
import type { BookmarksStore } from '../persistence/bookmarks-store';
import type { BookmarksResourcePublication } from '../resources/bookmarks-resource-publication';
import type { BookmarksWriteTransaction } from '../resources/bookmarks-write-stores';
import {
	createChapterBookmarksByLocation,
	type ChapterBookmarksByLocation
} from './bookmarks-bible-scope';
import { parseBookmarkDisplayMetadata } from './bookmark-metadata';
import {
	bookmarkTargetsEqual,
	parseBookmarkTarget,
	parseNormalizedBookmarkDocumentReference
} from './bookmark-target-validation';

/**
 * Bookmarks are local accepted Domain Objects. The service never publishes
 * directly; its writes atomically queue the Resource in the Outbox.
 *
 * `activePublisher` is supplied by Application composition. It must read the
 * *current* authenticated owner, rather than capturing one at construction.
 */
export class BookmarksService {
	private readonly subscribers = new Set<() => void>();

	constructor(
		private readonly store: Pick<BookmarksStore, 'get' | 'getAll'>,
		private readonly writeTransaction: BookmarksWriteTransaction,
		private readonly publication: Pick<BookmarksResourcePublication, 'create' | 'createDeletion'>,
		private readonly outbox: OutboxWakeup,
		private readonly activePublisher: () => string | undefined,
		private readonly bibleLocationReferenceService: Pick<BibleLocationReferenceService, 'extractBookIDChapter'>,
		private readonly newUuid: () => string = () => crypto.randomUUID(),
		private readonly now: () => number = () => Date.now()
	) {}

	/**
	 * Store a caller-selected canonical target and optional plain-text preview.
	 * The owning Reader verifies content addresses; Bookmarks validates only
	 * the target's shape/identity and never receives document content.
	 * Each call allocates a new ID, even for a duplicate target.
	 */
	async create(target: BookmarkTarget, previewText = ''): Promise<Bookmark> {
		const owner = this.requireOwner();
		const validatedTarget = parseBookmarkTarget(target);
		const bookmark: Bookmark = {
			id: createBookmarkId(owner, this.newUuid()),
			target: validatedTarget,
			...this.metadata(previewText)
		};
		const intent = this.publication.create(bookmark);

		await this.writeTransaction.run(async (stores) => {
			this.assertOwner(owner);
			await stores.bookmarks.put(bookmark);
			this.assertOwner(owner);
			await stores.outbox.put(bookmark.id, intent);
			this.assertOwner(owner);
		});

		this.changed();
		return bookmark;
	}

	/** Relocate the selected ID without interpreting the destination document. */
	async relocate(id: string, target: BookmarkTarget, previewText = ''): Promise<Bookmark> {
		const owner = this.requireOwnedId(id);
		const validatedTarget = parseBookmarkTarget(target);
		const existing = await this.store.get(id);
		this.assertOwner(owner);
		if (!existing || existing.id !== id) {
			throw new Error(`Bookmark not found: ${id}`);
		}
		if (bookmarkTargetsEqual(existing.target, validatedTarget)) {
			return existing;
		}

		const moved: Bookmark = { id, target: validatedTarget,
			...this.metadata(previewText, existing.updatedAt) };
		const intent = this.publication.create(moved);
		await this.writeTransaction.run(async (stores) => {
			this.assertOwner(owner);
			await stores.bookmarks.put(moved);
			this.assertOwner(owner);
			await stores.outbox.put(id, intent);
			this.assertOwner(owner);
		});

		this.changed();
		return moved;
	}

	/** Delete by stable Bookmark identity, never by target/location. */
	async delete(id: string): Promise<void> {
		const owner = this.requireOwnedId(id);
		const existing = await this.store.get(id);
		this.assertOwner(owner);
		if (!existing || existing.id !== id) {
			throw new Error(`Bookmark not found: ${id}`);
		}
		const intent = this.publication.createDeletion(id);
		await this.writeTransaction.run(async (stores) => {
			this.assertOwner(owner);
			await stores.bookmarks.delete(id);
			this.assertOwner(owner);
			await stores.outbox.put(id, intent);
			this.assertOwner(owner);
		});

		this.changed();
	}

	/** Reads can include accepted Bookmarks owned by other publishers. */
	get(id: string): Promise<Bookmark | undefined> {
		return this.store.get(id);
	}

	list(): Promise<readonly Bookmark[]> {
		return this.store.getAll();
	}

	/** Returns chapter-scoped exact locations for inline Bible Bookmark indicators. */
	async getChapterBookmarksByLocation(bibleLocationRef: string): Promise<ChapterBookmarksByLocation> {
		const chapterRef = this.bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		const installed = await this.store.getAll();
		return createChapterBookmarksByLocation(
			installed, chapterRef, this.bibleLocationReferenceService
		);
	}

	async listAtTarget(target: BookmarkTarget): Promise<readonly Bookmark[]> {
		const validatedTarget = parseBookmarkTarget(target);
		const bookmarks = await this.store.getAll();
		return bookmarks.filter((bookmark) => bookmarkTargetsEqual(bookmark.target, validatedTarget));
	}

	listForBibleLocation(bibleLocationRef: string): Promise<readonly Bookmark[]> {
		return this.listAtTarget({ kind: 'bible', bibleLocationRef });
	}

	/** Fetch all markers for a document once, not once for every rendered word. */
	async listForNormalizedDocument(
		document: NormalizedBookmarkDocumentReference
	): Promise<readonly Bookmark[]> {
		parseNormalizedBookmarkDocumentReference(document);
		const bookmarks = await this.store.getAll();
		return bookmarks.filter((bookmark) =>
			bookmark.target.kind === 'normalized-document' &&
			bookmark.target.document.publisher === document.publisher &&
			bookmark.target.document.resourceId === document.resourceId
		);
	}

	/**
	 * Explicitly invalidate consumers after an accepted external change, such as
	 * an archive import. Generic Resource-worker installs are not observed here.
	 */
	refresh(): void {
		this.notify();
	}

	/** Lightweight invalidation; consumers re-query accepted Domain state. */
	subscribe(listener: () => void): () => void {
		this.subscribers.add(listener);
		return () => this.subscribers.delete(listener);
	}

	/** Service-owned timestamp, independent from publication's monotonic modifiedAt. */
	private metadata(previewText: string, previousUpdatedAt = 0): Pick<Bookmark, 'updatedAt' | 'previewText'> {
		return parseBookmarkDisplayMetadata({
			updatedAt: Math.max(Math.trunc(this.now()), previousUpdatedAt + 1),
			previewText
		});
	}

	private requireOwner(): string {
		const owner = this.activePublisher();
		if (owner === undefined) {
			throw new Error('An active account is required to edit Bookmarks');
		}
		assertBookmarkPublisher(owner);
		return owner;
	}

	private requireOwnedId(id: string): string {
		const owner = this.requireOwner();
		if (parseBookmarkId(id).publisher !== owner) {
			throw new Error('Cannot modify a Bookmark owned by another account');
		}
		return owner;
	}

	private assertOwner(expected: string): void {
		if (this.activePublisher() !== expected) {
			throw new Error('Bookmark account changed during the operation');
		}
	}

	private changed(): void {
		this.notify();
		this.outbox.wake();
	}

	private notify(): void {
		for (const listener of this.subscribers) {
			try {
				listener();
			} catch {
				// A UI subscriber cannot roll back a completed Domain transaction.
			}
		}
	}
}
