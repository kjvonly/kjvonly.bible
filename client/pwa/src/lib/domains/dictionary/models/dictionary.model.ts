/** Publisher and Resource identity of one Dictionary edition, shared by indexes and chunks. */
export interface DictionaryEditionSource {
	readonly publisher: string;
	readonly resourceId: string;
}

/** A searchable word and the definition key it resolves to. Neither is globally unique. */
export interface HeadwordMatch {
	readonly headword: string;
	readonly key: string;
}

/** Include the selected edition so the UI can open the right definition. */
export interface DictionarySearchMatch extends DictionaryEditionSource, HeadwordMatch {}

/** HTML source is retained; normalized documents are derived only when read. */
export interface DictionaryDefinition {
	readonly word: string;
	readonly content: string;
}

/** One published edition: searchable associations are independent of stored definition keys. */
export interface DictionaryEditionBundle<TDefinition = unknown> {
	readonly definitionFormat: string;
	readonly headwords: readonly HeadwordMatch[];
	readonly definitions: Readonly<Record<string, TDefinition>>;
}

/** Accepted completed edition metadata for the chunked storage format. */
export interface DictionaryEditionManifest extends DictionaryEditionSource {
	readonly id: string;
	readonly edition: string;
	readonly modifiedAt: number;
	/** Number of stored definitions (not headword associations). */
	readonly entryCount: number;
	/** Format used for validation and selecting the definition presentation. */
	readonly definitionFormat: string;
	/** The only supported Dictionary storage format. */
	readonly storageFormat: 'chunks-v1';
	/** The generation referenced by the accepted chunk-map. */
	readonly chunkGeneration: string;
	readonly chunkCount: number;
}
