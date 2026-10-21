import type { DictionaryHeadwordIndex } from '../models/dictionary-headword-index.model';
import type { DictionaryEditionSource } from '../models/dictionary.model';

/** Index installed with the chunk-map and edition manifest, not a per-word cache. */
export const DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE = 'dictionary/search-index';
export const DICTIONARY_HEADWORD_INDEX_DATA_TYPE = 'kjvonly.dictionary.search-index';
export const DICTIONARY_HEADWORD_INDEX_DATA_VERSION = 1;

export interface DictionaryHeadwordIndexStore {
	/** Returns undefined for missing, stale, or incompatible installed indexes. */
	get(source: DictionaryEditionSource, sourceRevision: number): Promise<DictionaryHeadwordIndex | undefined>;
}
