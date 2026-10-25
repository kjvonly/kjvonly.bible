import type { DictionaryEditionSource } from '../../models/dictionary.model';

/** A known definition key can be read without searching, whether HTML or structured data. */
export type DictionaryDefinitionWorkerRequest = {
	readonly id: string;
	readonly type: 'get-definition' | 'get-normalized-definition';
	readonly source: DictionaryEditionSource;
	readonly key: string;
};

/** Transfer only the selected result, never the full compressed chunk. */
export type DictionaryDefinitionWorkerResponse =
	| { readonly id: string; readonly type: 'definition-ready' | 'normalized-ready'; readonly bytes: ArrayBuffer }
	| { readonly id: string; readonly type: 'error'; readonly error: string };
