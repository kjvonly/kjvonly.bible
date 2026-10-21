import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import { createDictionaryEditionId, parseDictionaryResourceId } from '../models/dictionary-identity';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../models/dictionary.model';

import {
	DICTIONARY_DATA_VERSION,
	DICTIONARY_EDITION_DATA_TYPE,
	DICTIONARY_EDITION_OBJECT_TYPE
} from '../resources/entries/dictionary-resource-contract';
import type { DictionaryHeadwordSourceStore } from './dictionary-headword-source-store';

/** Reads only a completed chunked-edition manifest from `domain_objects`. */
export class IndexedDBDictionaryHeadwordSourceStore implements DictionaryHeadwordSourceStore {
	constructor(private readonly getDB: () => Promise<ApplicationDB>) {}

	/** Retrieves the accepted edition manifest without loading any definition. */
	async getEdition(source: DictionaryEditionSource): Promise<DictionaryEditionManifest | undefined> {
		const { edition } = parseDictionaryResourceId(source.resourceId);
		const editionId = createDictionaryEditionId(source.publisher, edition);
		const db = await this.getDB();
		const stored = await db.get(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(DICTIONARY_EDITION_OBJECT_TYPE, editionId)
		);
		if (
			stored?.objectType !== DICTIONARY_EDITION_OBJECT_TYPE ||
			stored.dataType !== DICTIONARY_EDITION_DATA_TYPE ||
			stored.dataVersion !== DICTIONARY_DATA_VERSION
		) return undefined;

		const manifest = stored.value as DictionaryEditionManifest;
		if (
			manifest?.id !== editionId ||
			manifest.publisher !== source.publisher ||
			manifest.edition !== edition ||
			manifest.resourceId !== source.resourceId ||
			!Number.isFinite(manifest.modifiedAt) ||
			!Number.isSafeInteger(manifest.entryCount) ||
			manifest.entryCount < 1 ||
			manifest.storageFormat !== 'chunks-v1' ||
			manifest.chunkGeneration !== `m${manifest.modifiedAt}` ||
			typeof manifest.chunkCount !== 'number' ||
			!Number.isSafeInteger(manifest.chunkCount) ||
			manifest.chunkCount < 1
		) return undefined;
		return manifest;
	}

	/** Enumerate accepted edition manifests for the Dictionary Resource picker. */
	async listEditions(): Promise<readonly DictionaryEditionManifest[]> {
		const db = await this.getDB();
		const records = await db.getAllFromIndex(DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, DICTIONARY_EDITION_OBJECT_TYPE);
		const candidates = records.flatMap(record => {
			if (record.objectType !== DICTIONARY_EDITION_OBJECT_TYPE ||
				record.dataType !== DICTIONARY_EDITION_DATA_TYPE ||
				record.dataVersion !== DICTIONARY_DATA_VERSION) return [];
			const value = record.value as Partial<DictionaryEditionManifest>;
			if (typeof value?.publisher !== 'string' || typeof value?.resourceId !== 'string') return [];
			try {
				const { edition } = parseDictionaryResourceId(value.resourceId);
				createDictionaryEditionId(value.publisher, edition);
				return [{ publisher: value.publisher, resourceId: value.resourceId }];
			} catch { return []; }
		});
		const editions = await Promise.all(candidates.map(source => this.getEdition(source)));
		return editions.filter((edition): edition is DictionaryEditionManifest => edition !== undefined)
			.sort((a, b) => a.edition.localeCompare(b.edition) || a.publisher.localeCompare(b.publisher));
	}
}
