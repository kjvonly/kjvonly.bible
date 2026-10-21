import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import type { DictionaryPublishedIndexStore } from './dictionary-published-index-store';
import {
	createDictionaryPublishedIndexObjectId,
	DICTIONARY_PUBLISHED_INDEX_DATA_TYPE,
	DICTIONARY_PUBLISHED_INDEX_DATA_VERSION,
	DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
	validateDictionaryPublishedHeadwordIndex,
	type DictionaryPublishedHeadwordIndex
} from '../models/dictionary-published-headword-index.model';

/** Reads accepted, publisher-scoped portable index data from domain_objects. */
export class IndexedDBDictionaryPublishedIndexStore implements DictionaryPublishedIndexStore {
	constructor(private readonly getDB: () => Promise<ApplicationDB>) {}

	/** Read an accepted published index; its headword membership is verified before use. */
	async get(source: DictionaryEditionSource): Promise<DictionaryPublishedHeadwordIndex | undefined> {
		const db = await this.getDB();
		const stored = await db.get(DOMAIN_OBJECTS, createStoredDomainObjectId(
			DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
			createDictionaryPublishedIndexObjectId(source.publisher, source.resourceId)
		));
		if (stored?.objectType !== DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE ||
			stored.dataType !== DICTIONARY_PUBLISHED_INDEX_DATA_TYPE ||
			stored.dataVersion !== DICTIONARY_PUBLISHED_INDEX_DATA_VERSION) return;
		let published: DictionaryPublishedHeadwordIndex;
		try {
			published = validateDictionaryPublishedHeadwordIndex(stored.value);
		} catch {
			return;
		}
		if (published.resourceId !== source.resourceId) return;
		return published;
	}
}
