import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	SearchResultResponse
} from '$lib/domains/bible/models/search.model';

export interface SearchWorkerInitRequest {
	readonly action:
		'init';

	readonly searchIndex:
		BibleSearchIndex;
}

export interface SearchWorkerSearchRequest {
	readonly action:
		'search';

	readonly id:
		string;

	readonly searchIndexId:
		string;

	readonly text:
		string;
}

export type SearchWorkerRequest =
	| SearchWorkerInitRequest
	| SearchWorkerSearchRequest;

export interface SearchWorkerInitializedMessage {
	readonly type:
		'initialized';

	readonly searchIndexId:
		string;
}

export interface SearchWorkerInitializationFailedMessage {
	readonly type:
		'initialization-failed';

	readonly searchIndexId:
		string;

	readonly message:
		string;
}

export type SearchWorkerMessage =
	| SearchResultResponse
	| SearchWorkerInitializedMessage
	| SearchWorkerInitializationFailedMessage;
