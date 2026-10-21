import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import { createDictionaryHeadwordIndexId, isCurrentDictionaryHeadwordIndex, type DictionaryHeadwordIndex } from '../models/dictionary-headword-index.model';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import {
	DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
	DICTIONARY_HEADWORD_INDEX_DATA_VERSION,
	DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE,
	type DictionaryHeadwordIndexStore
} from './dictionary-headword-index-store';

/** Stores the exported FlexSearch cache in the existing Domain object store. */
export class IndexedDBDictionaryHeadwordIndexStore implements DictionaryHeadwordIndexStore {
	constructor(private readonly getDB: () => Promise<ApplicationDB>) {}

	async get(
		source: DictionaryEditionSource,
		sourceRevision: number
	): Promise<DictionaryHeadwordIndex | undefined> {
		const db = await this.getDB();
		const stored = await db.get(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(
				DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE,
				createDictionaryHeadwordIndexId(source)
			)
		);

		if (
			stored?.objectType !== DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE ||
			stored.dataType !== DICTIONARY_HEADWORD_INDEX_DATA_TYPE ||
			stored.dataVersion !== DICTIONARY_HEADWORD_INDEX_DATA_VERSION ||
			!isCurrentDictionaryHeadwordIndex(stored.value, source, sourceRevision)
		) return undefined;

		return stored.value;
	}
}
