import type {
	Note
} from '$lib/domains/notes/models/note.model';

import type {
	NotesStore
} from '$lib/domains/notes/persistence/notes-store';

import {
	NotesSearchRuntime
} from '$lib/domains/notes/runtime/search/notes-search-runtime';

import type {
	NotesSearchResult
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

import type {
	NotesWriteTransaction
} from '$lib/domains/notes/resources/notes-write-stores';

import type {
	NotesResourcePublication
} from '$lib/domains/notes/resources/notes-resource-publication';

import type {
	OutboxWakeup
} from '$lib/resource/outbox/outbox-wakeup';

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

	put(
		note: Note
	): void;

	remove(
		noteId: string
	): void;
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
 * Initial accepted Notes are loaded once from the Domain store. Normal Note
 * changes are applied incrementally to the search runtime. Resource acquisition
 * can later hand a newly accepted Note to this service without coupling the
 * installer to the search runtime.
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
				'getAll'
			>,

		private readonly writeTransaction:
			NotesWriteTransaction,

		private readonly resourcePublication:
			Pick<
				NotesResourcePublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup,

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

	deleteNote(
		_id: string,
		noteID: string
	): void {
		void this.ready.then(
			() => {
				this.runtime.remove(
					noteID
				);
			}
		);
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
