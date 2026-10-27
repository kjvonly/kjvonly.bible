import type {
	FilesystemSearchMatch
} from '../../models/filesystem-search-match';

import type {
	FilesystemSearchByIndex
} from '../../models/filesystem-search-index';

/** Request sent from the main-thread Filesystem search runtime to its worker. */
export interface FilesystemSearchWorkerRequest {
	readonly action: 'search';

	readonly id: string;

	readonly byIndex:
		FilesystemSearchByIndex;

	readonly text: string;
}

/** Successful Filesystem search response returned by the worker. */
export interface FilesystemSearchWorkerResult {
	readonly type: 'search-result';

	readonly id: string;

	readonly matches:
		readonly FilesystemSearchMatch[];
}

/** Failed Filesystem search response returned by the worker. */
export interface FilesystemSearchWorkerError {
	readonly type: 'search-error';

	readonly id: string;

	readonly message: string;
}

/** Response union emitted by the Filesystem search worker. */
export type FilesystemSearchWorkerResponse =
	| FilesystemSearchWorkerResult
	| FilesystemSearchWorkerError;
