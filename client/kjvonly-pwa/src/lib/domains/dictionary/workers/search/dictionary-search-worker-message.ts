import type { DictionaryEditionSource, DictionarySearchMatch } from '../../models/dictionary.model';

export type DictionarySearchWorkerRequest = {
	readonly id: string;
	readonly type: 'search';
	readonly query: string;
	readonly source: DictionaryEditionSource;
};

export type DictionarySearchWorkerResponse =
	{ readonly id: string; readonly type: 'search-results'; readonly matches: readonly DictionarySearchMatch[] }
	| { readonly id: string; readonly type: 'error'; readonly error: string };
