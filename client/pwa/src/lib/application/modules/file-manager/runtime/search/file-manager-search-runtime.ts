import type {
	LocatedFilesystemEntry
} from '../../models/located-filesystem-entry.model';

import {
	createFileManagerSearchDocument,
	createLocatedFilesystemEntryId
} from './file-manager-search-document';

import type {
	FileManagerSearchQuery
} from './file-manager-search.model';

import type {
	FileManagerSearchWorkerMessage,
	FileManagerSearchWorkerRequest
} from './file-manager-search-worker-message';

/** Minimal Worker surface required by the browser search runtime. */
export interface FileManagerSearchWorkerPort {
	postMessage(
		message: FileManagerSearchWorkerRequest
	): void;

	addEventListener(
		type: 'message',
		listener: (
			event: MessageEvent<FileManagerSearchWorkerMessage>
		) => void
	): void;

	addEventListener(
		type: 'error',
		listener: (
			event: ErrorEvent
		) => void
	): void;

	addEventListener(
		type: 'messageerror',
		listener: (
			event: MessageEvent
		) => void
	): void;

	terminate(): void;
}

/** Factory seam used by tests and by the browser Worker implementation. */
export type FileManagerSearchWorkerFactory =
	() => FileManagerSearchWorkerPort;

/** Promise callbacks for one in-flight worker search request. */
interface PendingSearch {
	readonly resolve:
		(entries: readonly LocatedFilesystemEntry[]) => void;
	readonly reject:
		(error: Error) => void;
}

/**
 * Owns one on-demand FileManager search worker for one active search lifetime.
 *
 * Only compact search documents cross the Worker boundary. Full filesystem
 * mappings stay on the main thread and are recovered from returned runtime IDs.
 */
export class FileManagerSearchRuntime {
	private readonly worker:
		FileManagerSearchWorkerPort;

	private nextRequestId = 1;
	private resolveInitialization:
		(() => void) | undefined;
	private rejectInitialization:
		((error: Error) => void) | undefined;
	private readonly pendingSearches =
		new Map<number, PendingSearch>();
	private readonly entriesById =
		new Map<string, LocatedFilesystemEntry>();
	private isDisposed = false;

	/** Whether the Worker/runtime is still alive; initialization may still be incomplete. */
	get isActive(): boolean {
		return !this.isDisposed;
	}

	constructor(
		createWorker: FileManagerSearchWorkerFactory =
			createBrowserFileManagerSearchWorker
	) {
		this.worker = createWorker();

		this.worker.addEventListener(
			'message',
			(event) => {
				this.onMessage(event.data);
			}
		);

		this.worker.addEventListener(
			'error',
			(event) => {
				this.failRuntime(
					event.error ??
						new Error(event.message)
				);
			}
		);

		this.worker.addEventListener(
			'messageerror',
			() => {
				this.failRuntime(
					new Error(
						'FileManager search worker message could not be deserialized.'
					)
				);
			}
		);
	}

	/**
	 * Replaces the worker's compact metadata snapshot and rebuilds the main-thread
	 * ID map used to turn worker result IDs back into LocatedFilesystemEntry values.
	 */
	initialize(
		entries: readonly LocatedFilesystemEntry[]
	): Promise<void> {
		this.assertActive();

		if (this.resolveInitialization) {
			throw new Error(
				'FileManager search initialization is already in progress.'
			);
		}

		this.entriesById.clear();

		const documents =
			entries.map((entry) => {
				const id =
					createLocatedFilesystemEntryId(
						entry
					);

				this.entriesById.set(id, entry);

				return createFileManagerSearchDocument(
					entry
				);
			});

		return new Promise<void>(
			(resolve, reject) => {
				this.resolveInitialization = resolve;
				this.rejectInitialization = reject;

				this.worker.postMessage({
					type: 'initialize',
					documents
				});
			}
		);
	}

	/** Sends one metadata query to the worker and resolves IDs back to full mappings. */
	search(
		query: FileManagerSearchQuery
	): Promise<readonly LocatedFilesystemEntry[]> {
		this.assertActive();

		const requestId =
			this.nextRequestId++;

		return new Promise(
			(resolve, reject) => {
				this.pendingSearches.set(
					requestId,
					{ resolve, reject }
				);

				this.worker.postMessage({
					type: 'search',
					requestId,
					text: query.text,
					...(query.filters
						? { filters: query.filters }
						: {})
				});
			}
		);
	}

	/** Terminates the worker and rejects any outstanding requests. */
	dispose(): void {
		if (this.isDisposed) {
			return;
		}

		this.isDisposed = true;
		this.worker.terminate();
		this.rejectPendingWork(
			new Error(
				'FileManager search runtime was disposed.'
			)
		);
	}

	private onMessage(
		message: FileManagerSearchWorkerMessage
	): void {
		switch (message.type) {
			case 'initialized': {
				const resolve =
					this.resolveInitialization;

				this.resolveInitialization = undefined;
				this.rejectInitialization = undefined;
				resolve?.();
				return;
			}

			case 'search-result': {
				const pendingSearch =
					this.pendingSearches.get(
						message.requestId
					);

				if (!pendingSearch) {
					return;
				}

				this.pendingSearches.delete(
					message.requestId
				);
				pendingSearch.resolve(
					message.ids
					.map((id) => this.entriesById.get(id))
					.filter(
						(entry): entry is LocatedFilesystemEntry =>
							entry !== undefined
					)
				);
				return;
			}

			case 'error': {
				const error =
					new Error(message.message);

				if (message.requestId !== undefined) {
					const pendingSearch =
						this.pendingSearches.get(
							message.requestId
						);

					if (pendingSearch) {
						this.pendingSearches.delete(
							message.requestId
						);
						pendingSearch.reject(error);
					}

					return;
				}

				this.rejectInitialization?.(error);
				this.resolveInitialization = undefined;
				this.rejectInitialization = undefined;
				return;
			}
		}
	}

	private failRuntime(
		error: Error
	): void {
		if (!this.isDisposed) {
			this.worker.terminate();
			this.isDisposed = true;
		}

		this.rejectPendingWork(error);
	}

	private rejectPendingWork(
		error: Error
	): void {
		this.rejectInitialization?.(error);
		this.resolveInitialization = undefined;
		this.rejectInitialization = undefined;

		for (const pendingSearch of this.pendingSearches.values()) {
			pendingSearch.reject(error);
		}

		this.pendingSearches.clear();
	}

	private assertActive(): void {
		if (this.isDisposed) {
			throw new Error(
				'FileManager search runtime has been disposed.'
			);
		}
	}
}

/** Creates the production module Worker lazily when FileManager search is opened. */
function createBrowserFileManagerSearchWorker():
	FileManagerSearchWorkerPort {
	return new Worker(
		new URL(
			'../../workers/file-manager-search.worker?worker',
			import.meta.url
		),
		{
			type: 'module'
		}
	);
}
