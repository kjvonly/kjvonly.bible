import type {
	FileManagerSearchDocument
} from './file-manager-search-document';

import type {
	FileManagerSearchFilters
} from './file-manager-search.model';

/** Main-thread requests accepted by the ephemeral FileManager search worker. */
export type FileManagerSearchWorkerRequest =
	| {
		readonly type: 'initialize';
		readonly documents: readonly FileManagerSearchDocument[];
	}
	| {
		readonly type: 'search';
		readonly requestId: number;
		readonly text: string;
		readonly filters?: FileManagerSearchFilters;
	};

/** Worker responses returned to the FileManager search runtime. */
export type FileManagerSearchWorkerMessage =
	| {
		readonly type: 'initialized';
	}
	| {
		readonly type: 'search-result';
		readonly requestId: number;
		readonly ids: readonly string[];
	}
	| {
		readonly type: 'error';
		readonly requestId?: number;
		readonly message: string;
	};
