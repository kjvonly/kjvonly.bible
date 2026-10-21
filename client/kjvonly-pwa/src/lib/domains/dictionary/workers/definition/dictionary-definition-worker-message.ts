import type { DictionaryEditionSource } from '../../models/dictionary.model';

/** One selected word and edition, never a whole compressed chunk. */
export interface DictionaryDefinitionWorkerRequest {
	readonly id: string;
	readonly type: 'get-normalized-definition';
	readonly source: DictionaryEditionSource;
	readonly headwordKey: string;
}

/** Only the selected normalized document is transferred, never a full chunk. */
export type DictionaryDefinitionWorkerResponse =
	| { readonly id: string; readonly type: 'normalized-ready'; readonly bytes: ArrayBuffer }
	| { readonly id: string; readonly type: 'error'; readonly error: string };
