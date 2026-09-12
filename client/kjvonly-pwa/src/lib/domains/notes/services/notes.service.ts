import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NotesSearchRuntime
} from '$lib/domains/notes/runtime/search/notes-search-runtime';

import type {
	NotesSearchResult
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

import {
	notesApi
} from '$lib/nostr/events/notes.nostr';

interface NotesCollectionSource {
	getAll(): Promise<Note[]>;
}

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
 * Temporary Notes application-facing service.
 *
 * The worker behind this service is now a pure local search runtime. The
 * legacy source remains here only until the following Notes persistence/write
 * slices switch service composition to NotesStore + Resource/Outbox flows.
 */
export class NotesService {
	private subscribers:
		NotesSubscriber[] =
		[];

	private ready:
		Promise<void>;

	constructor(
		private readonly runtime:
			NotesSearchRuntimePort =
				new NotesSearchRuntime(),

		private readonly source:
			NotesCollectionSource =
				legacyNotesSource
	) {
		this.runtime.setResultHandler(
			(response) => {
				this.publish(
					response
				);
			}
		);

		this.ready =
			this.loadSource();
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

	addNote(
		_id: string,
		_noteID: string,
		note: Note
	): void {
		void this.ready.then(
			() => {
				this.runtime.put(
					note
				);
			}
		);
	}

	init(): Promise<void> {
		this.ready =
			this.loadSource();

		return this.ready;
	}

	private async loadSource():
		Promise<void> {
		const notes =
			await this.source.getAll();

		this.runtime.initialize(
			notes
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

const legacyNotesSource:
	NotesCollectionSource = {
	getAll:
		() => notesApi.gets()
};

export const notesService =
	new NotesService();
