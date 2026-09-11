import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	SearchResultResponse
} from '$lib/domains/bible/models/search.model';

import type {
	BibleSearchIndexService
} from '$lib/domains/bible/services/bible-search-index.service';

import type {
	SearchWorkerMessage,
	SearchWorkerRequest
} from '$lib/domains/bible/workers/search/search-worker-message';

interface SearchWorkerPort {
	postMessage(
		message:
			SearchWorkerRequest
	): void;

	onmessage:
		((event: MessageEvent<SearchWorkerMessage>) => void) |
		null;
}

interface PendingInitialization {
	readonly promise:
		Promise<void>;

	readonly resolve:
		() => void;

	readonly reject:
		(error: Error) => void;
}

export class SearchRuntime {
	private readonly readySources =
		new Map<
			string,
			Promise<string>
		>();

	private readonly initializedIndexes =
		new Set<string>();

	private readonly pendingInitializations =
		new Map<
			string,
			PendingInitialization
		>();

	private resultHandler:
		(response: SearchResultResponse) => void =
			() => {};

	constructor(
		private readonly searchIndexes:
			Pick<
				BibleSearchIndexService,
				'get'
			>,

		private readonly worker:
			SearchWorkerPort =
				createSearchWorker()
	) {
		this.worker.onmessage =
			(event) => {
				this.handleWorkerMessage(
					event.data
				);
			};
	}

	setResultHandler(
		handler:
			(response: SearchResultResponse) => void
	): void {
		this.resultHandler =
			handler;
	}

	async search(
		id: string,
		source:
			PublishedResourceReference,
		text: string
	): Promise<void> {
		const searchIndexId =
			await this.ensureReady(
				source
			);

		this.worker.postMessage({
			action:
				'search',
			id,
			searchIndexId,
			text
		});
	}

	private ensureReady(
		source:
			PublishedResourceReference
	): Promise<string> {
		const sourceKey =
			resourceReferenceKey(
				source
			);

		const existing =
			this.readySources.get(
				sourceKey
			);

		if (existing) {
			return existing;
		}

		const ready =
			this.loadAndInitialize(
				source
			).catch(
				(error) => {
					if (
						this.readySources.get(
							sourceKey
						) === ready
					) {
						this.readySources.delete(
							sourceKey
						);
					}

					throw error;
				}
			);

		this.readySources.set(
			sourceKey,
			ready
		);

		return ready;
	}

	private async loadAndInitialize(
		source:
			PublishedResourceReference
	): Promise<string> {
		const searchIndex =
			await this.searchIndexes.get(
				source
			);

		await this.initializeWorker(
			searchIndex
		);

		return searchIndex.id;
	}

	private initializeWorker(
		searchIndex:
			BibleSearchIndex
	): Promise<void> {
		if (
			this.initializedIndexes.has(
				searchIndex.id
			)
		) {
			return Promise.resolve();
		}

		const pending =
			this.pendingInitializations.get(
				searchIndex.id
			);

		if (pending) {
			return pending.promise;
		}

		let resolve:
			() => void =
				() => {};

		let reject:
			(error: Error) => void =
				() => {};

		const promise =
			new Promise<void>(
				(
					resolvePromise,
					rejectPromise
				) => {
					resolve =
						resolvePromise;
					reject =
						rejectPromise;
				}
			);

		this.pendingInitializations.set(
			searchIndex.id,
			{
				promise,
				resolve,
				reject
			}
		);

		this.worker.postMessage({
			action:
				'init',
			searchIndex
		});

		return promise;
	}

	private handleWorkerMessage(
		message:
			SearchWorkerMessage
	): void {
		if (
			'type' in message &&
			message.type ===
				'initialized'
		) {
			this.completeInitialization(
				message.searchIndexId
			);
			return;
		}

		if (
			'type' in message &&
			message.type ===
				'initialization-failed'
		) {
			this.failInitialization(
				message.searchIndexId,
				message.message
			);
			return;
		}

		this.resultHandler(
			message
		);
	}

	private completeInitialization(
		searchIndexId: string
	): void {
		const pending =
			this.pendingInitializations.get(
				searchIndexId
			);

		this.pendingInitializations.delete(
			searchIndexId
		);

		this.initializedIndexes.add(
			searchIndexId
		);

		pending?.resolve();
	}

	private failInitialization(
		searchIndexId: string,
		message: string
	): void {
		const pending =
			this.pendingInitializations.get(
				searchIndexId
			);

		this.pendingInitializations.delete(
			searchIndexId
		);

		pending?.reject(
			new Error(
				message
			)
		);
	}
}

function resourceReferenceKey(
	reference:
		PublishedResourceReference
): string {
	return `${reference.publisher}/${reference.resourceId}`;
}

function createSearchWorker():
	SearchWorkerPort {
	return new Worker(
		new URL(
			'../../workers/kjvsearch.worker?worker',
			import.meta.url
		),
		{
			type:
				'module'
		}
	) as SearchWorkerPort;
}
