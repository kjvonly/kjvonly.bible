import type { DictionaryChunk, DictionaryChunkMap } from '../models/dictionary-chunk.model';
import type { DictionaryEditionSource } from '../models/dictionary.model';

/** Read-only access to accepted Dictionary chunk generations in domain_objects. */
export interface DictionaryChunkStore {
	/** Load the locator for one explicitly accepted edition generation. */
	getMap(source: DictionaryEditionSource, generation: string): Promise<DictionaryChunkMap | undefined>;

	/** Load one compressed chunk; callers must verify its bounds against the locator. */
	getChunk(source: DictionaryEditionSource, generation: string, ordinal: number): Promise<DictionaryChunk | undefined>;
}
