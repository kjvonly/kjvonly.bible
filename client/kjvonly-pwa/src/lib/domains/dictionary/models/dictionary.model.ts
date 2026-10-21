/** Publisher and Resource identity of one Dictionary edition, shared by indexes and chunks. */
export interface DictionaryEditionSource {
	readonly publisher: string;
	readonly resourceId: string;
}

/** One matched headword and its selected publisher/Resource identity; not a worker protocol. */
export interface DictionarySearchMatch extends DictionaryEditionSource {
	readonly headwordKey: string;
}

/** HTML source is retained; normalized documents are derived only when read. */
export interface DictionaryDefinition {
	readonly word: string;
	readonly content: string;
}

/** A published edition maps one canonical headword to ordered definitions. */
export type DictionaryEntriesBundle = Readonly<
	Record<string, readonly DictionaryDefinition[]>
>;

/** Accepted completed edition metadata for the chunked storage format. */
export interface DictionaryEditionManifest extends DictionaryEditionSource {
	readonly id: string;
	readonly edition: string;
	readonly modifiedAt: number;
	readonly entryCount: number;
	/** The only supported Dictionary storage format. */
	readonly storageFormat: 'chunks-v1';
	/** The generation referenced by the accepted chunk-map. */
	readonly chunkGeneration: string;
	readonly chunkCount: number;
}
