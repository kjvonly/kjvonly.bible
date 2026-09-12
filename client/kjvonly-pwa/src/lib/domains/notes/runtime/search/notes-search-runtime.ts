import type {
	Note
} from '$lib/domains/notes/models/note.model';

import type {
	NotesSearchResult,
	NotesSearchWorkerMessage,
	NotesSearchWorkerRequest
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

interface NotesSearchWorkerPort {
	postMessage(
		message:
			NotesSearchWorkerRequest
	): void;

	onmessage:
		((event: MessageEvent<NotesSearchWorkerMessage>) => void) |
		null;
}

export class NotesSearchRuntime {
	private resultHandler:
		(response: NotesSearchResult) => void =
			() => {};

	constructor(
		private readonly worker:
			NotesSearchWorkerPort =
				createNotesSearchWorker()
	) {
		this.worker.onmessage =
			(event) => {
				this.resultHandler(
					event.data
				);
			};
	}

	setResultHandler(
		handler:
			(response: NotesSearchResult) => void
	): void {
		this.resultHandler =
			handler;
	}

	initialize(
		notes: Note[]
	): void {
		this.worker.postMessage({
			action: 'initialize',
			notes
		});
	}

	put(
		note: Note
	): void {
		this.worker.postMessage({
			action: 'put',
			note
		});
	}

	putAll(
		notes: Note[]
	): void {
		this.worker.postMessage({
			action: 'put-all',
			notes
		});
	}

	remove(
		noteId: string
	): void {
		this.worker.postMessage({
			action: 'remove',
			noteId
		});
	}

	search(
		id: string,
		text: string,
		indexes: string[]
	): void {
		this.worker.postMessage({
			action: 'search',
			id,
			text,
			indexes
		});
	}

	getAll(
		id: string
	): void {
		this.worker.postMessage({
			action: 'get-all',
			id
		});
	}
}

function createNotesSearchWorker():
	NotesSearchWorkerPort {
	return new Worker(
		new URL(
			'../../workers/kjvnotes.worker?worker',
			import.meta.url
		),
		{
			type: 'module'
		}
	);
}
