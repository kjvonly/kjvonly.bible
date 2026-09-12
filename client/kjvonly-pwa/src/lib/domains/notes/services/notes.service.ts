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
	NotesResourceAcquisition
} from '$lib/domains/notes/resources/notes-resource-acquisition';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

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

	putAll(
		notes: Note[]
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
 * changes are applied incrementally to the search runtime. Selected Notes
 * Resources are acquired through the Resource lifecycle and accepted Notes are
 * then batched into the same search runtime without coupling installers to it.
 */
export class NotesService {
	private subscribers:
		NotesSubscriber[] =
			[];

	private ready:
		Promise<void>;

	private readonly acquiredSources =
		new Set<string>();

	private readonly inFlightAcquisitions =
		new Map<
			string,
			Promise<void>
		>();

	constructor(
		private readonly store:
			Pick<
				NotesStore,
				'getAll'
			>,

		private readonly resourceAcquisition:
			Pick<
				NotesResourceAcquisition,
				'acquire'
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

	async acquire(
		source: PublishedResourceReference
	): Promise<void> {
		await this.ready;

		const key =
			this.createSourceKey(
				source
			);

		if (
			this.acquiredSources.has(
				key
			)
		) {
			return;
		}

		const inFlight =
			this.inFlightAcquisitions.get(
				key
			);

		if (inFlight !== undefined) {
			await inFlight;
			return;
		}

		const acquisition =
			this.acquireSource(
				source,
				key
			);

		this.inFlightAcquisitions.set(
			key,
			acquisition
		);

		try {
			await acquisition;
		} finally {
			if (
				this.inFlightAcquisitions.get(
					key
				) === acquisition
			) {
				this.inFlightAcquisitions.delete(
					key
				);
			}
		}
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


	private async acquireSource(
		source: PublishedResourceReference,
		key: string
	): Promise<void> {
		const notes =
			await this.resourceAcquisition.acquire(
				source
			);

		if (notes.length > 0) {
			this.runtime.putAll(
				[...notes]
			);
		}

		this.acquiredSources.add(
			key
		);
	}

	private createSourceKey(
		source: PublishedResourceReference
	): string {
		return JSON.stringify([
			source.publisher,
			source.resourceId
		]);
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
