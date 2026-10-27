import { describe, expect, it, vi } from 'vitest';
import type { ApplicationDB, StoredDomainObject } from '$lib/infrastructure/persistence/application.db';
import { createStoredDomainObjectId } from '$lib/infrastructure/persistence/application.db';
import { createDictionaryChunkMapObjectId, createDictionaryChunkObjectId } from '../models/dictionary-chunk-identity';
import { createDictionaryChunkMap } from '../models/dictionary-chunk.model';
import { DICTIONARY_CHUNK_MAP_OBJECT_TYPE, DICTIONARY_CHUNK_OBJECT_TYPE } from '../models/dictionary-chunk.model';
import { DICTIONARY_CHUNK_DATA_TYPE, DICTIONARY_CHUNK_MAP_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION } from '../resources/entries/dictionary-resource-contract';
import { IndexedDBDictionaryChunkStore } from './indexeddb-dictionary-chunk-store';

const source = { publisher: 'publisher-a', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const generation = 'm123';
const map = createDictionaryChunkMap(source, generation, [{ chunkId: '0000', firstKey: 'a', lastKey: 'z' }]);
const gzip = new Uint8Array([31, 139, 8]);
const chunk = {
	id: createDictionaryChunkObjectId(source, generation, 0),
	source, generation, chunkId: '0000', ordinal: 0, firstKey: 'a', lastKey: 'z',
	uncompressedBytes: 28, compressedBytes: gzip.byteLength, gzip
};
function envelope(objectType: string, objectId: string, dataType: string, value: unknown): StoredDomainObject {
	return { id: createStoredDomainObjectId(objectType, objectId), objectType, objectId,
		dataType, dataVersion: DICTIONARY_CHUNK_DATA_VERSION, value };
}
function createStore(records: StoredDomainObject[]) {
	const byId = new Map(records.map(record => [record.id, record]));
	const get = vi.fn(async (_store: string, id: string) => byId.get(id));
	const db = { get } as unknown as ApplicationDB;
	return { store: new IndexedDBDictionaryChunkStore(async () => db), get };
}

describe('IndexedDBDictionaryChunkStore', () => {
	it('looks up a range map and one compressed chunk by their generation-scoped primary keys', async () => {
		const fixture = createStore([
			envelope(DICTIONARY_CHUNK_MAP_OBJECT_TYPE, createDictionaryChunkMapObjectId(source, generation), DICTIONARY_CHUNK_MAP_DATA_TYPE, map),
			envelope(DICTIONARY_CHUNK_OBJECT_TYPE, chunk.id, DICTIONARY_CHUNK_DATA_TYPE, chunk)
		]);
		expect(await fixture.store.getMap(source, generation)).toEqual(map);
		expect(await fixture.store.getChunk(source, generation, 0)).toEqual(chunk);
		expect(fixture.get).toHaveBeenCalledTimes(2);
	});

	it('rejects a mislabeled locator and damaged chunk content', async () => {
		const wrongMap = { ...map, source: { ...source, publisher: 'other' } };
		const badMap = createStore([envelope(DICTIONARY_CHUNK_MAP_OBJECT_TYPE, map.id, DICTIONARY_CHUNK_MAP_DATA_TYPE, wrongMap)]);
		await expect(badMap.store.getMap(source, generation)).rejects.toThrow('Invalid persisted Dictionary chunk-map');
		const badChunk = createStore([envelope(DICTIONARY_CHUNK_OBJECT_TYPE, chunk.id, DICTIONARY_CHUNK_DATA_TYPE,
			{ ...chunk, compressedBytes: 4 })]);
		await expect(badChunk.store.getChunk(source, generation, 0)).rejects.toThrow('Invalid persisted Dictionary chunk');
	});

	it('returns undefined for absent chunks and never searches other generations', async () => {
		const { store, get } = createStore([]);
		expect(await store.getChunk(source, 'm124', 0)).toBeUndefined();
		expect(get.mock.calls[0]?.[1]).toContain('m124');
	});
});
