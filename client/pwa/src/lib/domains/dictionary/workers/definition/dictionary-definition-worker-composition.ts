import { getApplicationDB } from '$lib/infrastructure/persistence/application.db';
import { IndexedDBDictionaryHeadwordSourceStore } from '../../persistence/indexeddb-dictionary-headword-source-store';
import { IndexedDBDictionaryChunkStore } from '../../persistence/indexeddb-dictionary-chunk-store';
import { DictionaryDefinitionRuntime } from './dictionary-definition-runtime';

/** Worker-local composition: IndexedDB, decompression, and lookup never use ApplicationContext. */
export function createDictionaryDefinitionWorkerRuntime(): DictionaryDefinitionRuntime {
	return new DictionaryDefinitionRuntime(
		new IndexedDBDictionaryHeadwordSourceStore(getApplicationDB),
		new IndexedDBDictionaryChunkStore(getApplicationDB)
	);
}
