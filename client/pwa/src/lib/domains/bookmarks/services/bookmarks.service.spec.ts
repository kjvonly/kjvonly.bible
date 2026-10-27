import { describe, expect, it, vi } from 'vitest';
import type { ResourcePublicationIntent } from '$lib/resource';
import { BibleLocationReferenceService } from '$lib/domains/bible';

import type { BibleBookmarkTarget, Bookmark } from '../models/bookmark.model';
import type { BookmarksStore } from '../persistence/bookmarks-store';
import type { BookmarksWriteStores, BookmarksWriteTransaction } from '../resources/bookmarks-write-stores';
import { BookmarksResourcePublication } from '../resources/bookmarks-resource-publication';
import { BookmarksService } from './bookmarks.service';

const OWNER = 'publisher';
const OTHER_OWNER = 'other-owner';
const UUIDS = [
	'7afc541f-b7c7-48dd-9bc1-58b55a1bfbf4',
	'd63324e3-b662-4940-86ea-9faf28f50c9d'
];
const BIBLE: BibleBookmarkTarget = { kind: 'bible', bibleLocationRef: '43_3_16_0' };
const NORMALIZED = {
	kind: 'normalized-document',
	document: { publisher: 'commentary-author', resourceId: 'commentaries/matthew-henry/genesis-1' },
	address: { kind: 'word', blockId: 'p1', contentIndex: 0 }
} as const;

class MemoryStore implements Pick<BookmarksStore, 'get' | 'getAll'> {
	readonly accepted = new Map<string, Bookmark>();
	onGet?: () => void;

	async get(id: string): Promise<Bookmark | undefined> {
		this.onGet?.();
		return this.accepted.get(id);
	}

	async getAll(): Promise<readonly Bookmark[]> {
		return [...this.accepted.values()];
	}
}

class MemoryTransaction implements BookmarksWriteTransaction {
	readonly publications = new Map<string, ResourcePublicationIntent>();
	readonly runCount = vi.fn();
	failPublication = false;
	onPutBookmark?: () => void;

	constructor(private readonly store: MemoryStore) {}

	async run<TResult>(operation: (stores: BookmarksWriteStores) => Promise<TResult>): Promise<TResult> {
		this.runCount();
		const accepted = new Map(this.store.accepted);
		const queued = new Map(this.publications);
		const result = await operation({
			bookmarks: {
				put: async (bookmark) => {
					accepted.set(bookmark.id, bookmark);
					this.onPutBookmark?.();
				},
				delete: async (id) => {
					accepted.delete(id);
					this.onPutBookmark?.();
				}
			},
			outbox: {
				put: async (id, publication) => {
					if (this.failPublication) throw new Error('Outbox unavailable');
					queued.set(id, publication);
				}
			}
		});
		this.store.accepted.clear();
		for (const [id, bookmark] of accepted) this.store.accepted.set(id, bookmark);
		this.publications.clear();
		for (const [id, publication] of queued) this.publications.set(id, publication);
		return result;
	}
}

function harness() {
	const store = new MemoryStore();
	const transaction = new MemoryTransaction(store);
	const outbox = { wake: vi.fn() };
	let owner: string | undefined = OWNER;
	let nextId = 0;
	const service = new BookmarksService(
		store, transaction, new BookmarksResourcePublication(), outbox,
		() => owner, new BibleLocationReferenceService(), () => UUIDS[nextId++],
		() => 1791840000000
	);
	return {
		store, transaction, outbox, service,
		setOwner: (next: string | undefined) => { owner = next; }
	};
}

describe('BookmarksService', () => {
	it('creates separate Bookmark IDs for identical targets, atomically queues each and wakes after commit', async () => {
		const { service, store, transaction, outbox } = harness();
		const first = await service.create(BIBLE, 'For God so loved the world.');
		const second = await service.create(BIBLE);
		expect(first.id).not.toBe(second.id);
		expect(first.id).toBe(`${OWNER}/default/${UUIDS[0]}`);
		expect(await service.listForBibleLocation('43_3_16_0')).toEqual([first, second]);
		expect(store.accepted.size).toBe(2);
		expect(transaction.publications.get(first.id)).toMatchObject({
			publisher: OWNER, value: { target: BIBLE, updatedAt: 1791840000000, previewText: 'For God so loved the world.' }
		});
		expect(outbox.wake).toHaveBeenCalledTimes(2);
	});

	it('loads chapter-scoped word and verse-number indicators from a full Bible location', async () => {
		const { service, store } = harness();
		const atVerse = await service.create(BIBLE);
		const duplicate = await service.create(BIBLE);
		store.accepted.set('other/1', {
			id: 'other/1',
			target: { kind: 'bible', bibleLocationRef: '43_3_17_7' },
			updatedAt: 123, previewText: ''
		});
		store.accepted.set('other/2', {
			id: 'other/2',
			target: { kind: 'bible', bibleLocationRef: '43_4_1_0' },
			updatedAt: 123, previewText: ''
		});
		store.accepted.set('other/3', {
			id: 'other/3',
			target: NORMALIZED,
			updatedAt: 123, previewText: ''
		});

		expect(await service.getChapterBookmarksByLocation('kjv/43_3_16_4')).toEqual({
			'43_3_16_0': true,
			'43_3_17_7': true
		});
		expect(await service.getChapterBookmarksByLocation('43_4_1_0')).toEqual({
			'43_4_1_0': true
		});
		expect(await service.getChapterBookmarksByLocation('43_5')).toEqual({});
		expect(atVerse.id).not.toBe(duplicate.id);
	});

	it('relocates only the selected Bookmark, retaining stable ID and publication identity', async () => {
		const { service, transaction, outbox } = harness();
		const first = await service.create(BIBLE, 'For God so loved the world.');
		const second = await service.create(BIBLE);
		const previousResource = transaction.publications.get(first.id);
		const changed = await service.relocate(first.id, { kind: 'bible', bibleLocationRef: '43_3_17_4' }, 'Another verse.');
		expect(changed.id).toBe(first.id);
		expect(changed.target).toEqual({ kind: 'bible', bibleLocationRef: '43_3_17_4' });
		expect(changed.updatedAt).toBe(first.updatedAt + 1);
		expect(changed.previewText).toBe('Another verse.');
		expect(await service.listForBibleLocation('43_3_16_0')).toEqual([second]);
		expect(transaction.publications.get(first.id)?.resourceId).toBe(previousResource?.resourceId);
		expect(transaction.publications.get(first.id)).toMatchObject({ value: { target: changed.target,
			updatedAt: changed.updatedAt, previewText: changed.previewText } });
		expect(outbox.wake).toHaveBeenCalledTimes(3);
		const untouched = await service.relocate(first.id, { kind: 'bible', bibleLocationRef: '43_3_17_4' });
		expect(untouched).toEqual(changed);
		expect(transaction.runCount).toHaveBeenCalledTimes(3);
		expect(outbox.wake).toHaveBeenCalledTimes(3);
	});

	it('deletes exactly one Bookmark and emits a Resource deletion for that ID', async () => {
		const { service, store, transaction } = harness();
		const first = await service.create(BIBLE, 'For God so loved the world.');
		const second = await service.create(BIBLE);
		await service.delete(first.id);
		expect(await service.get(first.id)).toBeUndefined();
		expect(await service.listAtTarget(BIBLE)).toEqual([second]);
		expect(store.accepted.size).toBe(1);
		expect(transaction.publications.get(first.id)).toMatchObject({
			operation: 'delete', publisher: OWNER
		});
		await expect(service.delete(first.id)).rejects.toThrow('not found');
	});

	it('preserves a Bookmark and emits no notification if its deletion cannot queue publication', async () => {
        const { service, transaction, outbox } = harness();
        const first = await service.create(BIBLE);
        const second = await service.create(BIBLE);
        const changed = vi.fn();
        service.subscribe(changed);
        const originalIntent = transaction.publications.get(first.id);
        transaction.failPublication = true;

        await expect(service.delete(first.id)).rejects.toThrow('Outbox unavailable');
        expect(await service.listAtTarget(BIBLE)).toEqual([first, second]);
        expect(transaction.publications.get(first.id)).toEqual(originalIntent);
        expect(changed).not.toHaveBeenCalled();
        expect(outbox.wake).toHaveBeenCalledTimes(2);
    });

	it('looks up exact publisher/Resource pairs without matching another publisher or Resource', async () => {
		const { service } = harness();
		const normalized = await service.create(NORMALIZED);
		const unrelated = await service.create(BIBLE);
		expect(await service.listForNormalizedDocument(NORMALIZED.document)).toEqual([normalized]);
		expect(await service.listForNormalizedDocument({
			...NORMALIZED.document, publisher: 'another-publisher'
		})).toEqual([]);
		expect(await service.listForNormalizedDocument({
			...NORMALIZED.document, resourceId: 'other-document'
		})).toEqual([]);
		expect(await service.list()).toEqual([normalized, unrelated]);
		expect(await service.listAtTarget(NORMALIZED)).toEqual([normalized]);
		expect(await service.listForBibleLocation('43_3_16_0')).toEqual([unrelated]);
	});

	it('trusts canonical word addresses supplied by normalized content without a document', async () => {
		const { service, transaction } = harness();
		const address = { kind: 'word', blockId: 'word-not-installed-here', contentIndex: 999 } as const;
		const selectedTarget = { ...NORMALIZED, address };
		const created = await service.create(selectedTarget, 'Reader-selected preview');
		expect(created.target).toEqual(selectedTarget);
		expect(created.previewText).toBe('Reader-selected preview');
		const moved = await service.relocate(created.id, NORMALIZED, 'Updated preview');
		expect(moved.target).toEqual(NORMALIZED);
		expect(moved.previewText).toBe('Updated preview');
		expect(moved.id).toBe(created.id);
		expect(transaction.runCount).toHaveBeenCalledTimes(2);
		await expect(service.create({ ...NORMALIZED, address: { ...address, contentIndex: -1 } }))
			.rejects.toThrow('word address');
		expect(transaction.runCount).toHaveBeenCalledTimes(2);
	});

	it('rejects unauthenticated writes and modifications to third-party Bookmarks', async () => {
		const { service, setOwner, store, transaction } = harness();
		setOwner(undefined);
		await expect(service.create(BIBLE)).rejects.toThrow('active account');
		setOwner(OWNER);
		const local = await service.create(BIBLE);
		const thirdParty = { ...local, id: `${OTHER_OWNER}/default/${UUIDS[0]}` };
		store.accepted.set(thirdParty.id, thirdParty);
		expect(await service.get(thirdParty.id)).toEqual(thirdParty);
		await expect(service.delete(thirdParty.id)).rejects.toThrow('another account');
		await expect(service.relocate(thirdParty.id, BIBLE)).rejects.toThrow('another account');
		setOwner(OTHER_OWNER);
		await expect(service.delete(local.id)).rejects.toThrow('another account');
		expect(transaction.runCount).toHaveBeenCalledTimes(1);
	});

	it('refuses a stale relocation after account changes while loading the Bookmark', async () => {
		const { service, store, transaction, outbox, setOwner } = harness();
		const original = await service.create(BIBLE);
		store.onGet = () => setOwner(OTHER_OWNER);
		await expect(service.relocate(original.id, {
			kind: 'bible', bibleLocationRef: '43_3_17_8'
		})).rejects.toThrow('account changed');
		expect(transaction.runCount).toHaveBeenCalledTimes(1);
		expect(outbox.wake).toHaveBeenCalledTimes(1);
	});

	it('aborts an in-flight write if the account changes before the Outbox is queued', async () => {
		const { service, store, transaction, outbox, setOwner } = harness();
		transaction.onPutBookmark = () => setOwner(OTHER_OWNER);
		await expect(service.create(BIBLE)).rejects.toThrow('account changed');
		expect(store.accepted.size).toBe(0);
		expect(transaction.publications.size).toBe(0);
		expect(outbox.wake).not.toHaveBeenCalled();
	});

	it('does not publish or notify when the transaction fails', async () => {
		const { service, store, transaction, outbox } = harness();
		const changed = vi.fn();
		service.subscribe(changed);
		transaction.failPublication = true;
		await expect(service.create(BIBLE)).rejects.toThrow('Outbox unavailable');
		expect(store.accepted.size).toBe(0);
		expect(outbox.wake).not.toHaveBeenCalled();
		expect(changed).not.toHaveBeenCalled();
	});

	it('notifies once after commits and refresh, and lets consumers unsubscribe', async () => {
		const { service } = harness();
		const changed = vi.fn();
		const unsubscribe = service.subscribe(changed);
		const created = await service.create(BIBLE);
		await service.relocate(created.id, { kind: 'bible', bibleLocationRef: '43_3_17_1' });
		await service.delete(created.id);
		await expect(service.delete(created.id)).rejects.toThrow('not found');
		service.refresh();
		expect(changed).toHaveBeenCalledTimes(4);
		unsubscribe();
		service.refresh();
		expect(changed).toHaveBeenCalledTimes(4);
	});
	describe('mounted Bookmark consumers', () => {
		it('invalidates independent Readers and lists after create, relocate, delete, and import', async () => {
			const { service, store, transaction } = harness();
			let john: Awaited<ReturnType<BookmarksService['getChapterBookmarksByLocation']>> = {};
			let romans: Awaited<ReturnType<BookmarksService['getChapterBookmarksByLocation']>> = {};
			let firstList: readonly Bookmark[] = [];
			let secondList: readonly Bookmark[] = [];
			const reads: Promise<void>[] = [];
			const observe = <T>(read: () => Promise<T>, assign: (value: T) => void) => vi.fn(() => {
				reads.push(read().then(assign));
			});
			const johnChanged = observe(
				() => service.getChapterBookmarksByLocation('43_3_16_0'),
				(value) => { john = value; }
			);
			const romansChanged = observe(
				() => service.getChapterBookmarksByLocation('45_8_28_0'),
				(value) => { romans = value; }
			);
			const firstListChanged = observe(() => service.list(), (value) => { firstList = value; });
			const secondListChanged = observe(() => service.list(), (value) => { secondList = value; });
			const unsubscribeJohn = service.subscribe(johnChanged);
			service.subscribe(romansChanged);
			service.subscribe(firstListChanged);
			const unsubscribeSecondList = service.subscribe(secondListChanged);
			const settle = async () => { await Promise.all(reads.splice(0)); };

			// The database is not yet committed when the transaction writes the draft.
			transaction.onPutBookmark = () => {
				expect(johnChanged).not.toHaveBeenCalled();
				expect(firstListChanged).not.toHaveBeenCalled();
			};
			const first = await service.create(BIBLE, 'John verse');
			transaction.onPutBookmark = undefined;
			await settle();
			expect(john).toEqual({ '43_3_16_0': true });
			expect(romans).toEqual({});
			expect(firstList).toEqual([first]);
			expect(secondList).toEqual([first]);

			const duplicate = await service.create(BIBLE, 'Another bookmark on John');
			await settle();
			expect(john).toEqual({ '43_3_16_0': true }); // One icon, two Bookmarks.
			expect(firstList).toHaveLength(2);

			const moved = await service.relocate(first.id, {
				kind: 'bible', bibleLocationRef: '45_8_28_2'
			}, 'Romans verse');
			await settle();
			expect(john).toEqual({ '43_3_16_0': true });
			expect(romans).toEqual({ '45_8_28_2': true });
			expect(firstList).toContainEqual(moved);
			expect(secondList).toContainEqual(moved);

			await service.delete(duplicate.id);
			await settle();
			expect(john).toEqual({});
			expect(romans).toEqual({ '45_8_28_2': true });
			expect(firstList.map((bookmark) => bookmark.id)).toEqual([first.id]);

			// Accepted external/imported state notifies mounted views via refresh().
			const imported: Bookmark = {
				id: 'another-publisher/default/7afc541f-b7c7-48dd-9bc1-58b55a1bfbf4',
				target: BIBLE, updatedAt: 1791840000000, previewText: 'Imported John verse'
			};
			store.accepted.set(imported.id, imported);
			service.refresh();
			await settle();
			expect(john).toEqual({ '43_3_16_0': true });
			expect(firstList).toHaveLength(2);
			expect(secondList).toHaveLength(2);

			// Unmounting one Reader and one list does not silence other subscribers.
			unsubscribeJohn();
			unsubscribeSecondList();
			const previousJohnCalls = johnChanged.mock.calls.length;
			const previousSecondListCalls = secondListChanged.mock.calls.length;
			await service.delete(first.id);
			await settle();
			expect(johnChanged).toHaveBeenCalledTimes(previousJohnCalls);
			expect(secondListChanged).toHaveBeenCalledTimes(previousSecondListCalls);
			expect(romans).toEqual({});
			expect(firstList).toEqual([imported]);
			expect(romansChanged).toHaveBeenCalledTimes(6);
			expect(firstListChanged).toHaveBeenCalledTimes(6);
		});

		it('continues notifying remaining views if one subscriber throws', async () => {
			const { service } = harness();
			const stillMounted = vi.fn();
			service.subscribe(() => { throw new Error('Unrelated view failed'); });
			service.subscribe(stillMounted);
			await service.create(BIBLE);
			service.refresh();
			expect(stillMounted).toHaveBeenCalledTimes(2);
		});
	});

});


describe('Bookmark saved metadata', () => {
	it('validates plain-text preview before persisting or notifying', async () => {
		const { service, transaction, outbox } = harness();
		await expect(service.create(BIBLE, '<em>markup</em>')).rejects.toThrow('previewText');
		await expect(service.create(BIBLE, 'a'.repeat(4097))).rejects.toThrow('previewText');
		expect(transaction.runCount).not.toHaveBeenCalled();
		expect(outbox.wake).not.toHaveBeenCalled();
	});

	it('persists and publishes normalized preview without changing document-scoped identity', async () => {
		const { service, transaction } = harness();
		const bookmark = await service.create(NORMALIZED, 'A sentence from this document.');
		expect(bookmark.previewText).toBe('A sentence from this document.');
		expect(transaction.publications.get(bookmark.id)).toMatchObject({ value: {
			target: NORMALIZED, updatedAt: bookmark.updatedAt, previewText: bookmark.previewText
		} });
	});
});
