import { getApplicationDB } from '$lib/infrastructure/persistence/application.db';
import { IndexedDBDictionaryHeadwordIndexStore } from '../../persistence/indexeddb-dictionary-headword-index-store';
import { IndexedDBDictionaryHeadwordSourceStore } from '../../persistence/indexeddb-dictionary-headword-source-store';
import { DictionarySearchRuntime } from './dictionary-search-runtime';

/** Independent worker composition root; never consumes Svelte ApplicationContext. */
export function createDictionarySearchWorkerRuntime(): DictionarySearchRuntime {
	return new DictionarySearchRuntime(
		new IndexedDBDictionaryHeadwordSourceStore(getApplicationDB),
		new IndexedDBDictionaryHeadwordIndexStore(getApplicationDB)
	);
}
