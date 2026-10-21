import type { DictionaryEditionSource } from '../models/dictionary.model';

/**
 * Copy a Dictionary Resource selection into plain, structured-cloneable data.
 * UI selections can be Svelte reactive proxies, which Worker.postMessage rejects.
 * Keep only primitive identity fields; never transfer reactive objects or definitions.
 */
export function snapshotDictionaryWorkerSource(source: DictionaryEditionSource): DictionaryEditionSource {
	return { publisher: source.publisher, resourceId: source.resourceId };
}
