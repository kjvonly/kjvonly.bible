import type { DictionaryEditionSource } from '../models/dictionary.model';
import type { DictionaryPublishedHeadwordIndex } from '../models/dictionary-published-headword-index.model';

/** Read-only access to a required published index stored by Resource installation. */
export interface DictionaryPublishedIndexStore {
	get(source: DictionaryEditionSource): Promise<DictionaryPublishedHeadwordIndex | undefined>;
}
