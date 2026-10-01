import type {
	FilesystemSearchMatch
} from '../../models/filesystem-search-match';

import type {
	FilesystemSearchByIndex
} from '../../models/filesystem-search-index';

export interface FilesystemSearchWorkerRequest {
	readonly action: 'search';

	readonly id: string;

	readonly byIndex:
		FilesystemSearchByIndex;

	readonly text: string;
}

export interface FilesystemSearchWorkerResult {
	readonly type: 'search-result';

	readonly id: string;

	readonly matches:
		readonly FilesystemSearchMatch[];
}

export interface FilesystemSearchWorkerError {
	readonly type: 'search-error';

	readonly id: string;

	readonly message: string;
}

export type FilesystemSearchWorkerResponse =
	| FilesystemSearchWorkerResult
	| FilesystemSearchWorkerError;
