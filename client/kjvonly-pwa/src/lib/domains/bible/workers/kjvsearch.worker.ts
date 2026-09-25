import type {
	BibleSearchIndex
} from '../models/bible-search-index.model';

import type {
	SearchResultResponse
} from '../models/search.model';

import {
	SearchIndexRuntime
} from './search/search-index-runtime';

import type {
	SearchWorkerInitializationFailedMessage,
	SearchWorkerInitializedMessage,
	SearchWorkerRequest
} from './search/search-worker-message';

const runtime =
	new SearchIndexRuntime();


onmessage = async (
	e: MessageEvent<SearchWorkerRequest>
) => {
	switch (e.data.action) {
		case 'init':
			await initialize(
				e.data.searchIndex
			);
			break;

		case 'reset':
			runtime.reset();
			break;

		case 'search':
			await search(
				e.data.id,
				e.data.searchIndexId,
				e.data.text
			);
			break;
	}
};

async function initialize(
	searchIndex:
		BibleSearchIndex
): Promise<void> {
	try {
		await runtime.initialize(
			searchIndex
		);

		const message:
			SearchWorkerInitializedMessage = {
			type:
				'initialized',
			searchIndexId:
				searchIndex.id
		};

		postMessage(
			message
		);
	} catch (error) {
		const message:
			SearchWorkerInitializationFailedMessage = {
			type:
				'initialization-failed',
			searchIndexId:
				searchIndex.id,
			message:
				error instanceof Error
					? error.message
					: String(error)
		};

		postMessage(
			message
		);
	}
}

async function search(
	id: string,
	searchIndexId: string,
	text: string
): Promise<void> {
	const startedAt =
		performance.now();

	const bibleLocationRefs =
		await runtime.search(
			searchIndexId,
			text
		);

	const response:
		SearchResultResponse = {
		id,
		text,
		bibleLocationRefs,
		stats: {
			count:
				bibleLocationRefs.length,
			time:
				`${Math.round(
					performance.now() -
					startedAt
				)} ms`
		}
	};

	postMessage(
		response
	);
}
