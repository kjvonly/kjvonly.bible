import type { DictionaryEditionSource, DictionaryEditionManifest } from '../models/dictionary.model';


/** Retrieves the accepted chunked edition manifest; no definition or entry scans. */
export interface DictionaryHeadwordSourceStore {
	/** Returns undefined for missing or invalid chunked edition manifests. */
	getEdition(source: DictionaryEditionSource): Promise<DictionaryEditionManifest | undefined>;
	/** Lists accepted editions for the selection view without opening definitions. */
	listEditions(): Promise<readonly DictionaryEditionManifest[]>;
}
