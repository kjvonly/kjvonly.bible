import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	SearchWorkerMessage,
	SearchWorkerRequest
} from '$lib/domains/bible/workers/search/search-worker-message';

import {
	SearchRuntime
} from './search-runtime';

const SOURCE:
	PublishedResourceReference = {
	publisher:
		'publisher',
	resourceId:
		'kjvonly/bible/search/kjvs'
};

const SEARCH_INDEX:
	BibleSearchIndex = {
	id:
		'publisher/kjvs',
	version:
		'kjvs',
	chunks:
		{} as BibleSearchIndex['chunks']
};

describe(
	'SearchRuntime',
	() => {
		it(
			'lazily loads and initializes the selected Search Resource before searching',
			async () => {
				const searchIndexes = {
					get:
						vi.fn()
							.mockResolvedValue(
								SEARCH_INDEX
							)
				};

				const worker =
					new FakeSearchWorker();

				const runtime =
					new SearchRuntime(
						searchIndexes as any,
						worker
					);

				const search =
					runtime.search(
						'search-1',
						SOURCE,
						'beginning'
					);

				await nextMicrotask();

				expect(
					searchIndexes.get
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					worker.messages
				).toEqual([
					{
						action:
							'init',
						searchIndex:
							SEARCH_INDEX
					}
				]);

				worker.emit({
					type:
						'initialized',
					searchIndexId:
						SEARCH_INDEX.id
				});

				await search;

				expect(
					worker.messages.at(-1)
				).toEqual({
					action:
						'search',
					id:
						'search-1',
					searchIndexId:
						SEARCH_INDEX.id,
					text:
						'beginning'
				});
			}
		);

		it(
			'reuses the initialized Search Resource without loading or importing its chunks again',
			async () => {
				const searchIndexes = {
					get:
						vi.fn()
							.mockResolvedValue(
								SEARCH_INDEX
							)
				};

				const worker =
					new FakeSearchWorker();

				const runtime =
					new SearchRuntime(
						searchIndexes as any,
						worker
					);

				const first =
					runtime.search(
						'search-1',
						SOURCE,
						'beginning'
					);

				await nextMicrotask();

				worker.emit({
					type:
						'initialized',
					searchIndexId:
						SEARCH_INDEX.id
				});

				await first;

				await runtime.search(
					'search-2',
					SOURCE,
					'earth'
				);

				expect(
					searchIndexes.get
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					worker.messages.filter(
						(message) =>
							message.action ===
							'init'
					)
				).toHaveLength(
					1
				);
			}
		);

		it(
			'shares one initialization across concurrent first searches',
			async () => {
				const searchIndexes = {
					get:
						vi.fn()
							.mockResolvedValue(
								SEARCH_INDEX
							)
				};

				const worker =
					new FakeSearchWorker();

				const runtime =
					new SearchRuntime(
						searchIndexes as any,
						worker
					);

				const first =
					runtime.search(
						'search-1',
						SOURCE,
						'beginning'
					);

				const second =
					runtime.search(
						'search-2',
						SOURCE,
						'earth'
					);

				await nextMicrotask();

				expect(
					searchIndexes.get
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					worker.messages
				).toHaveLength(
					1
				);

				worker.emit({
					type:
						'initialized',
					searchIndexId:
						SEARCH_INDEX.id
				});

				await Promise.all([
					first,
					second
				]);

				expect(
					worker.messages.filter(
						(message) =>
							message.action ===
							'search'
					)
				).toHaveLength(
					2
				);
			}
		);
	}
);

class FakeSearchWorker {
	readonly messages:
		SearchWorkerRequest[] = [];

	onmessage:
		((event: MessageEvent<SearchWorkerMessage>) => void) |
		null =
			null;

	postMessage(
		message:
			SearchWorkerRequest
	): void {
		this.messages.push(
			message
		);
	}

	emit(
		message:
			SearchWorkerMessage
	): void {
		this.onmessage?.({
			data:
				message
		} as MessageEvent<SearchWorkerMessage>);
	}
}

function nextMicrotask():
	Promise<void> {
	return new Promise(
		(resolve) =>
			queueMicrotask(
				resolve
			)
	);
}
