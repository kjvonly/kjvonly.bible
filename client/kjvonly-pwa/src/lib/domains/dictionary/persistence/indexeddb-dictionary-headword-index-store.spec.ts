import { describe, expect, it, vi } from 'vitest';
import type { ApplicationDB, StoredDomainObject } from '$lib/infrastructure/persistence/application.db';
import { DOMAIN_OBJECTS, createStoredDomainObjectId } from '$lib/infrastructure/persistence/application.db';
import {
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	createDictionaryHeadwordIndexId,
	type DictionaryHeadwordIndex
} from '../models/dictionary-headword-index.model';
import {
	DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
	DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE
} from './dictionary-headword-index-store';
import { IndexedDBDictionaryHeadwordIndexStore } from './indexeddb-dictionary-headword-index-store';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const index: DictionaryHeadwordIndex = {
	id: createDictionaryHeadwordIndexId(source),
	...source,
	sourceRevision: 42,
	formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	headwordCount: 2,
	chunks: { reg: '{}', cfg: '{}' }
};

function setup(existing?: StoredDomainObject) {
	const get = vi.fn().mockResolvedValue(existing);
	const db = { get } as unknown as ApplicationDB;
	return { get, store: new IndexedDBDictionaryHeadwordIndexStore(async () => db) };
}

function wrap(value: unknown): StoredDomainObject {
	return {
		id: createStoredDomainObjectId(DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE, index.id),
		objectType: DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE,
		objectId: index.id,
		dataType: DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
		dataVersion: 1,
		value
	};
}

describe('IndexedDBDictionaryHeadwordIndexStore', () => {
	it('looks up the publisher/Resource cache and returns current data', async () => {
		const { get, store } = setup(wrap(index));
		expect(await store.get(source, 42)).toEqual(index);
		expect(get).toHaveBeenCalledWith(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE, index.id)
		);
	});

	it('treats missing, changed-revision, and incompatible caches as misses', async () => {
		expect(await setup().store.get(source, 42)).toBeUndefined();
		expect(await setup(wrap(index)).store.get(source, 43)).toBeUndefined();
		expect(await setup(wrap({ ...index, formatVersion: 0 })).store.get(source, 42)).toBeUndefined();
		expect(await setup({ ...wrap(index), dataVersion: 2 }).store.get(source, 42)).toBeUndefined();
	});

	it('rejects a persisted index whose identity differs from the requested edition', async () => {
		expect(await setup(wrap({ ...index, id: 'wrong' })).store.get(source, 42)).toBeUndefined();
		expect(await setup(wrap({ ...index, publisher: 'another-publisher' })).store.get(source, 42)).toBeUndefined();
		expect(await setup(wrap({ ...index, resourceId: 'kjvonly/dictionary/entries/webster-1844' })).store.get(source, 42)).toBeUndefined();
	});
});
