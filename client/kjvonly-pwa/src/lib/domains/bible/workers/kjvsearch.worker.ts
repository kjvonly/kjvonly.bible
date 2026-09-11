import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	SearchResultResponse
} from '$lib/domains/bible/models/search.model';

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


/**
 * Development helper for exporting an initialized FlexSearch index.
 *
 * The worker intentionally does not read application persistence.
 * Pass the Domain Search Index id for the in-memory index to export.
 */
export async function exportIndexToConsole(
	searchIndexId: string
): Promise<void> {
	const chunks =
		await runtime.export(
			searchIndexId
		);

	console.log(
		'export Index',
		chunks
	);
}

onmessage = async (
	e: MessageEvent<SearchWorkerRequest>
) => {
	switch (e.data.action) {
		case 'init':
			await initialize(
				e.data.searchIndex
			);
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
