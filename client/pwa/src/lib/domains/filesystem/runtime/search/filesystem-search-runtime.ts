import type {
	FilesystemSearchMatch
} from '../../models/filesystem-search-match';

import type {
	FilesystemSearchByIndex
} from '../../models/filesystem-search-index';

import type {
	FilesystemSearchWorkerRequest,
	FilesystemSearchWorkerResponse
} from './filesystem-search-worker-message';

interface FilesystemSearchWorkerPort {
	postMessage(
		message:
			FilesystemSearchWorkerRequest
	): void;

	onmessage:
		((event: MessageEvent<FilesystemSearchWorkerResponse>) => void) |
		null;
}

interface PendingSearch {
	readonly resolve:
		(matches: readonly FilesystemSearchMatch[]) => void;

	readonly reject:
		(error: Error) => void;
}

/** Main-thread client for filesystem metadata searches performed in a worker. */
export class FilesystemSearchRuntime {
	private nextRequestId = 0;

	private readonly pending =
		new Map<
			string,
			PendingSearch
		>();

	constructor(
		private readonly worker:
			FilesystemSearchWorkerPort =
				createFilesystemSearchWorker()
	) {
		this.worker.onmessage =
			(event) => {
				const request =
					this.pending.get(
						event.data.id
					);

				if (!request) {
					return;
				}

				this.pending.delete(
					event.data.id
				);

				switch (event.data.type) {
					case 'search-result':
						request.resolve(
							event.data.matches
						);
						break;

					case 'search-error':
						request.reject(
							new Error(
								event.data.message
							)
						);
						break;
				}
			};
	}

	/** Searches mounted entries selected by one indexed descriptor field. */
	search(
		byIndex:
			FilesystemSearchByIndex,
		text: string
	): Promise<
		readonly FilesystemSearchMatch[]
	> {
		const id =
			String(
				this.nextRequestId++
			);

		return new Promise(
			(resolve, reject) => {
				this.pending.set(
					id,
					{
						resolve,
						reject
					}
				);

				this.worker.postMessage({
					action: 'search',
					id,
					byIndex,
					text
				});
			}
		);
	}
}

function createFilesystemSearchWorker():
	FilesystemSearchWorkerPort {
	return new Worker(
		new URL(
			'../../workers/filesystem-search.worker?worker',
			import.meta.url
		),
		{
			type: 'module'
		}
	);
}
