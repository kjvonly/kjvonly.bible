import type {
	Note
} from '../models/note.model';

import type {
	AvailableNote
} from '../models/available-note';

import type {
	NotesStore
} from '../persistence/notes-store';

import {
	NotesSearchRuntime
} from '../runtime/search/notes-search-runtime';

import type {
	NotesSearchResult
} from '../runtime/search/notes-search-worker-message';

import type {
	NotesWriteTransaction
} from '../resources/notes-write-stores';

import type {
	NotesResourcePublication
} from '../resources/notes-resource-publication';

import type {
	OutboxWakeup
} from '$lib/application';

import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	FilesystemSearchByIndex,
	FilesystemSearchMatch
} from '$lib/domains/filesystem';

import {
	createNoteIdForDescriptor
} from '../resources/notes-resource-source';

import {
	NOTES_RESOURCE_TYPE
} from '../resources/note-interpreter';

interface NotesSearchRuntimePort {
	setResultHandler(
		handler:
			(response: NotesSearchResult) => void
	): void;

	initialize(
		notes: Note[]
	): void;

	search(
		id: string,
		text: string,
		indexes: string[]
	): void;

	getAll(
		id: string
	): void;

	refresh(): void;

	put(
		note: Note
	): void;

	remove(
		noteId: string
	): void;
}

interface NotesFilesystemSearchPort {
	search(
		byIndex:
			FilesystemSearchByIndex,
		text: string
	): Promise<
		readonly FilesystemSearchMatch[]
	>;
}

interface NotesResourceDescriptorLoader {
	loadDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<void>;
}

interface NotesSubscriber {
	readonly subID: string;
	readonly id: string;
	readonly fn:
		(response: NotesSearchResult) => void;
}

/**
 * Application-facing Notes service.
 *
 * Accepted Notes are loaded from the shared Domain Object store through the
 * NotesStore abstraction, then handed to the pure local search runtime.
 *
 * Initial accepted Notes are loaded from the Domain store. Normal Note changes
 * are applied incrementally to the search runtime. External persistence changes
 * can signal refresh(), which asks the worker to reload accepted Notes directly
 * from IndexedDB and rebuild its search projection.
 *
 * When an already-known ResourceDescriptor identifies an individual Note, this
 * service preserves the normal Domain boundary: check Notes persistence first,
 * ask the generic Resource loader to install the descriptor when missing, then
 * read Notes persistence again. Resource installation never returns the Note.
 */
export class NotesService {
	private subscribers:
		NotesSubscriber[] =
			[];

	private ready:
		Promise<void>;

	constructor(
		private readonly store:
			Pick<
				NotesStore,
				'get' |
					'getAll'
			>,

		private readonly writeTransaction:
			NotesWriteTransaction,

		private readonly resourcePublication:
			Pick<
				NotesResourcePublication,
				'create' |
					'createDeletion'
			>,

		private readonly outbox:
			OutboxWakeup,

		private readonly filesystem:
			NotesFilesystemSearchPort,

		private readonly resourceLoader:
			NotesResourceDescriptorLoader,

		private readonly runtime:
			NotesSearchRuntimePort =
				new NotesSearchRuntime()
	) {
		this.runtime.setResultHandler(
			(response) => {
				this.publish(
					response
				);
			}
		);

		this.ready =
			this.loadAcceptedNotes();
	}

	unsubscribe(
		subID: string
	): void {
		this.subscribers =
			this.subscribers.filter(
				(subscriber) =>
					subscriber.subID !==
						subID
			);
	}

	subscribe(
		subID: string,
		id: string,
		fn:
			(response: NotesSearchResult) => void
	): void {
		this.subscribers.push({
			subID,
			id,
			fn
		});
	}

	searchNotes(
		id: string,
		text: string,
		indexes: string[]
	): void {
		void this.ready.then(
			() => {
				this.runtime.search(
					id,
					text,
					indexes
				);
			}
		);
	}

	getAllNotes(
		id: string
	): void {
		void this.ready.then(
			() => {
				this.runtime.getAll(
					id
				);
			}
		);
	}

	/**
	 * Finds individual Note Resources advertised by mounted filesystems.
	 *
	 * Installed Notes are omitted so callers can merge this projection with the
	 * normal local Notes search without showing the same Note twice.
	 */
	async searchAvailableNotes(
		text: string
	): Promise<
		readonly AvailableNote[]
	> {
		await this.ready;

		const matches =
			await this.filesystem.search(
				{
					index: 'category',
					value:
						NOTES_RESOURCE_TYPE
				},
				text
			);

		const candidates =
			new Map<
				string,
				AvailableNote
			>();

		for (const match of matches) {
			const descriptor =
				match.entry.descriptor;

			if (
				descriptor.metadata.category !==
					NOTES_RESOURCE_TYPE
			) {
				continue;
			}

			let noteId: string;

			try {
				noteId =
					createNoteIdForDescriptor(
						descriptor
					);
			} catch {
				// Bundle/invalid Note descriptors are not individual list entries.
				continue;
			}

			if (
				candidates.has(
					noteId
				)
			) {
				continue;
			}

			candidates.set(
				noteId,
				{
					id: noteId,
					name:
						createAvailableNoteName(
							match
						),
					filesystemPublisher:
						match.publisher,
					rootPath:
						match.rootPath,
					path:
						match.entry.path,
					descriptor
				}
			);
		}

		const availability =
			await Promise.all(
				[...candidates.values()]
					.map(
						async (candidate) => ({
							candidate,
							existing:
								await this.store.get(
									candidate.id
								)
						})
					)
			);

		return availability
			.filter(
				({ existing }) =>
					existing === undefined
			)
			.map(
				({ candidate }) =>
					candidate
			);
	}

	refresh(): void {
		void this.ready.then(
			() => {
				this.runtime.refresh();
			}
		);
	}

	/**
	 * Returns one individual Note represented by an already-known descriptor.
	 *
	 * The Resource layer is responsible only for ensuring the descriptor is
	 * processed. Notes remains authoritative for retrieving the installed
	 * Domain object from its own persistence.
	 */
	async getByDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<Note> {
		await this.ready;

		const noteId =
			createNoteIdForDescriptor(
				descriptor
			);

		const existing =
			await this.store.get(
				noteId
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		await this.resourceLoader
			.loadDescriptor(
				descriptor
			);

		const installed =
			await this.store.get(
				noteId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Note was not installed: ${noteId}`
			);
		}

		this.runtime.put(
			installed
		);

		return installed;
	}

	async put(
		note: Note
	): Promise<void> {
		await this.ready;

		const publication =
			this.resourcePublication
				.create(
					note
				);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores
					.notes
					.put(
						note
					);

				await stores
					.outbox
					.put(
						note.id,
						publication
					);
			}
		);

		this.runtime.put(
			note
		);

		this.outbox.wake();
	}

	async delete(
		noteId: string
	): Promise<void> {
		await this.ready;

		const deletion =
			this.resourcePublication
				.createDeletion(
					noteId
				);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores
					.notes
					.delete(
						noteId
					);

				await stores
					.outbox
					.put(
						noteId,
						deletion
					);
			}
		);

		this.runtime.remove(
			noteId
		);

		this.outbox.wake();
	}

	private async loadAcceptedNotes():
		Promise<void> {
		const notes =
			await this.store.getAll();

		this.runtime.initialize(
			[...notes]
		);
	}

	private publish(
		response:
			NotesSearchResult
	): void {
		this.subscribers.forEach(
			(subscriber) => {
				if (
					subscriber.id ===
						response.id
				) {
					subscriber.fn(
						response
					);
				}
			}
		);
	}
}

function createAvailableNoteName(
	match: FilesystemSearchMatch
): string {
	const descriptorName =
		match.entry.descriptor
			.metadata.name;

	if (descriptorName !== undefined) {
		return descriptorName;
	}

	const pathSegments =
		match.entry.path
			.split('/')
			.filter(Boolean);

	return (
		pathSegments[
			pathSegments.length - 1
		] ??
		match.entry.descriptor
			.metadata.resourceId
	);
}
