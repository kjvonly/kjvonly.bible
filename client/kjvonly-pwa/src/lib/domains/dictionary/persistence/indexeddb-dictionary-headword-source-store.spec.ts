import { describe, expect, it, vi } from 'vitest';
import type { ApplicationDB } from '$lib/infrastructure/persistence/application.db';
import { DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, createStoredDomainObjectId } from '$lib/infrastructure/persistence/application.db';
import { DICTIONARY_EDITION_OBJECT_TYPE } from '../resources/entries/dictionary-resource-contract';
import { IndexedDBDictionaryHeadwordSourceStore } from './indexeddb-dictionary-headword-source-store';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const manifest = {
	id: 'publisher/webster-1828', publisher: 'publisher', edition: 'webster-1828',
	resourceId: source.resourceId, modifiedAt: 100, entryCount: 5,
	storageFormat: 'chunks-v1', chunkGeneration: 'm100', chunkCount: 2
};

/** The manifest check uses one primary-key read; no definition data is opened. */
function setup(value: unknown) {
	const get = vi.fn().mockResolvedValue(value);
	const transaction = vi.fn(() => { throw new Error('Dictionary search must not scan entry keys'); });
	const db = { get, transaction } as unknown as ApplicationDB;
	return { get, transaction, store: new IndexedDBDictionaryHeadwordSourceStore(async () => db) };
}

function stored(value: unknown) {
	return {
		objectType: DICTIONARY_EDITION_OBJECT_TYPE,
		dataType: 'kjvonly.dictionary.edition', dataVersion: 1, value
	};
}

describe('IndexedDBDictionaryHeadwordSourceStore', () => {
	it('accepts only a completed chunked edition manifest using its direct primary key', async () => {
		const { store, get, transaction } = setup(stored(manifest));
		expect(await store.getEdition(source)).toEqual(manifest);
		expect(get).toHaveBeenCalledWith(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(DICTIONARY_EDITION_OBJECT_TYPE, manifest.id)
		);
		expect(transaction).not.toHaveBeenCalled();
	});

	it('lists accepted Dictionary editions without reading headword chunks', async () => {
		const second = { ...manifest, edition: 'webster-1844', resourceId: 'kjvonly/dictionary/entries/webster-1844', id: 'publisher/webster-1844' };
		const get = vi.fn(async (_store: unknown, id: string) => stored(id.endsWith('webster-1844') ? second : manifest));
		const getAllFromIndex = vi.fn().mockResolvedValue([
			stored(manifest),
			stored(second)
		]);
		const db = { get, getAllFromIndex } as unknown as ApplicationDB;
		const store = new IndexedDBDictionaryHeadwordSourceStore(async () => db);
		const editions = await store.listEditions();
		expect(getAllFromIndex).toHaveBeenCalledExactlyOnceWith(
			DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, DICTIONARY_EDITION_OBJECT_TYPE
		);
		expect(editions.map(edition => edition.edition)).toEqual(['webster-1828', 'webster-1844']);
	});

	it('rejects absent, malformed, incomplete and wrong-source editions', async () => {
		expect(await setup(undefined).store.getEdition(source)).toBeUndefined();
		expect(await setup(stored({ ...manifest, storageFormat: undefined })).store.getEdition(source)).toBeUndefined();
		expect(await setup(stored({ ...manifest, chunkCount: 0 })).store.getEdition(source)).toBeUndefined();
		expect(await setup(stored({ ...manifest, chunkGeneration: 'm99' })).store.getEdition(source)).toBeUndefined();
		expect(await setup(stored({ ...manifest, publisher: 'someone-else' })).store.getEdition(source)).toBeUndefined();
	});
});
