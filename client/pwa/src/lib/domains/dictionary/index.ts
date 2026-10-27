/** Node-safe Dictionary Domain boundary. Runtime/module exports belong under /ui. */
export type {
	DictionaryDefinition,
	DictionaryEditionBundle,
	DictionaryEditionManifest,
	DictionarySearchMatch,
	HeadwordMatch
} from './models/dictionary.model';

export {
	normalizeDictionaryHeadword,
	createDictionaryEditionId,
	createDictionaryEntryId,
	createDictionaryResourceId,
	parseDictionaryResourceId
} from './models/dictionary-identity';

export {
	DICTIONARY_RESOURCE_TYPE,
	DICTIONARY_ENTRIES_DATA_TYPE,
	DICTIONARY_EDITION_DATA_TYPE,
	DICTIONARY_DATA_VERSION,
	DICTIONARY_EDITION_OBJECT_TYPE
} from './resources/entries/dictionary-resource-contract';

export {
	DictionaryEntriesDataTypeHandler
} from './resources/entries/dictionary-entries-data-type-handler';
export type { DictionaryDefinitionFormatValidator } from './resources/entries/dictionary-definition-format-validator';
export { WebsterDefinitionFormatValidator } from './resources/entries/webster-definition-format-validator';

export type { DictionaryHeadwordIndex } from './models/dictionary-headword-index.model';
export type { DictionaryEditionSource } from './models/dictionary.model';
export {
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	createDictionaryHeadwordIndexId,
	isCurrentDictionaryHeadwordIndex
} from './models/dictionary-headword-index.model';
export type { DictionaryHeadwordIndexStore } from './persistence/dictionary-headword-index-store';
export {
	DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE,
	DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
	DICTIONARY_HEADWORD_INDEX_DATA_VERSION
} from './persistence/dictionary-headword-index-store';

export { DictionaryModuleResourceSelectionContributor } from './resources/dictionary-module-resource-selection-contributor';

export { DictionaryInstallationService } from './services/dictionary-installation.service';
export type { DictionaryInstallationStatus } from './services/dictionary-installation.service';

export {
	DICTIONARY_VIEWS,
	parseDictionaryRootNavigationState,
	type DictionaryRootNavigationState,
	type DictionaryView
} from './models/dictionary-navigation.model';

export { DictionaryResourceHandler } from './resources/entries/dictionary-resource-handler';
export { DictionaryChunkInstaller, DICTIONARY_CHUNK_TARGET_BYTES, DICTIONARY_CHUNK_WRITE_BATCH_SIZE } from './resources/entries/dictionary-chunk-installer';

export {
	DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE,
	DICTIONARY_PUBLISHED_INDEX_DATA_TYPE,
	DICTIONARY_PUBLISHED_INDEX_DATA_VERSION,
	DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
	createDictionaryPublishedIndexResourceId,
	entriesResourceIdForPublishedIndex,
	createDictionaryPublishedIndexObjectId,
	validateDictionaryPublishedHeadwordIndex
} from './models/dictionary-published-headword-index.model';
export type { DictionaryPublishedHeadwordIndex } from './models/dictionary-published-headword-index.model';
export { DictionaryPublishedHeadwordIndexDataTypeHandler } from './resources/search-index/dictionary-published-headword-index-data-type-handler';
export { DictionaryPublishedHeadwordIndexFactory } from './resources/search-index/dictionary-published-headword-index-factory';
export { IndexedDBDictionaryPublishedIndexStore } from './persistence/indexeddb-dictionary-published-index-store';
export { DictionaryPublishedIndexPreparer } from './services/dictionary-published-index-preparer';

export { createDictionaryService } from './services/dictionary.service';
export type { DictionaryService } from './services/dictionary.service';
