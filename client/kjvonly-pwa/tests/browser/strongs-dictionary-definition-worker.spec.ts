import { afterEach, describe, expect, it } from 'vitest';
import {
    DOMAIN_OBJECTS,
    createStoredDomainObjectId,
    getApplicationDB,
    type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';
import {
    DICTIONARY_CHUNK_MAP_OBJECT_TYPE,
    DICTIONARY_CHUNK_OBJECT_TYPE,
    createDictionaryChunkMap,
    type DictionaryChunk
} from '$lib/domains/dictionary/models/dictionary-chunk.model';
import {
    createDictionaryChunkGeneration,
    createDictionaryChunkMapObjectId,
    createDictionaryChunkObjectId
} from '$lib/domains/dictionary/models/dictionary-chunk-identity';
import { createDictionaryEditionId } from '$lib/domains/dictionary/models/dictionary-identity';
import {
    DICTIONARY_CHUNK_DATA_TYPE,
    DICTIONARY_CHUNK_MAP_DATA_TYPE,
    DICTIONARY_CHUNK_DATA_VERSION,
    DICTIONARY_DATA_VERSION,
    DICTIONARY_EDITION_DATA_TYPE,
    DICTIONARY_EDITION_OBJECT_TYPE
} from '$lib/domains/dictionary/resources/entries/dictionary-resource-contract';
import { DictionaryRuntime } from '$lib/domains/dictionary/runtime/dictionary-runtime';
import { StrongsService } from '$lib/domains/strongs';

/** Integration through real IndexedDB, compressed Dictionary chunks, and a definition worker. */
const source = {
    publisher: `strongs-dictionary-browser-${crypto.randomUUID()}`,
    resourceId: 'kjvonly/dictionary/entries/strongs-kjvs'
};
const generation = createDictionaryChunkGeneration(123);
const storedIds: string[] = [];

const greek = {
    number: 'G26', originalWord: 'ἀγάπη', partsOfSpeech: 'Noun',
    phoneticSpelling: 'ag-ah-pay', transliteratedWord: 'agapē',
    usageByBook: [], usageByWord: [], brownDef: null,
    strongsDef: '<p>love</p>', thayersDef: null
};
const hebrew = {
    ...greek, number: 'H157', originalWord: 'אָהַב', transliteratedWord: 'ahab',
    strongsDef: '<p>to love</p>'
};

function record(objectType: string, objectId: string, dataType: string, dataVersion: number, value: unknown): StoredDomainObject {
    const id = createStoredDomainObjectId(objectType, objectId);
    storedIds.push(id);
    return { id, objectType, objectId, dataType, dataVersion, value };
}

async function installDictionaryFixture(): Promise<void> {
    const json = JSON.stringify({ G26: greek, H157: hebrew });
    const compressed = new Uint8Array(await new Response(
        new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer());
    const chunkObjectId = createDictionaryChunkObjectId(source, generation, 0);
    const mapObjectId = createDictionaryChunkMapObjectId(source, generation);
    const editionId = createDictionaryEditionId(source.publisher, 'strongs-kjvs');
    const chunk: DictionaryChunk = {
        id: chunkObjectId, source, generation, chunkId: '0000', ordinal: 0,
        firstKey: 'G26', lastKey: 'H157', gzip: compressed,
        compressedBytes: compressed.byteLength,
        uncompressedBytes: new TextEncoder().encode(json).byteLength
    };
    const map = createDictionaryChunkMap(source, generation, [
        { chunkId: '0000', firstKey: 'G26', lastKey: 'H157' }
    ]);
    const edition = {
        ...source, id: editionId, edition: 'strongs-kjvs', modifiedAt: 123,
        entryCount: 2, definitionFormat: 'strongs', storageFormat: 'chunks-v1' as const,
        chunkGeneration: generation, chunkCount: 1
    };
    const db = await getApplicationDB();
    const transaction = db.transaction(DOMAIN_OBJECTS, 'readwrite');
    for (const value of [
        record(DICTIONARY_CHUNK_OBJECT_TYPE, chunkObjectId, DICTIONARY_CHUNK_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION, chunk),
        record(DICTIONARY_CHUNK_MAP_OBJECT_TYPE, mapObjectId, DICTIONARY_CHUNK_MAP_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION, map),
        record(DICTIONARY_EDITION_OBJECT_TYPE, editionId, DICTIONARY_EDITION_DATA_TYPE, DICTIONARY_DATA_VERSION, edition)
    ]) void transaction.store.put(value);
    await transaction.done;
}

afterEach(async () => {
    if (storedIds.length === 0) return;
    const db = await getApplicationDB();
    const transaction = db.transaction(DOMAIN_OBJECTS, 'readwrite');
    for (const id of storedIds) void transaction.store.delete(id);
    await transaction.done;
    storedIds.length = 0;
});

describe("Strong's Dictionary definition lookup", () => {
    it('retrieves Hebrew and Greek definitions by exact key through the Dictionary worker', async () => {
        await installDictionaryFixture();
        const runtime = new DictionaryRuntime();
        const service = new StrongsService({
            get: (selection, key) => runtime.get(selection, key),
            prepareSource: async selection => ({
                source: selection, status: 'ready' as const,
                edition: {
                    ...selection, id: createDictionaryEditionId(selection.publisher, 'strongs-kjvs'),
                    edition: 'strongs-kjvs', modifiedAt: 123,
                    entryCount: 2, definitionFormat: 'strongs', storageFormat: 'chunks-v1' as const,
                    chunkGeneration: generation, chunkCount: 1
                }
            })
        });
        await expect(service.get(source, 'G26')).resolves.toEqual({
            ...greek, id: `${source.publisher}/kjvs/G26`
        });
        await expect(service.get(source, 'H157')).resolves.toEqual({
            ...hebrew, id: `${source.publisher}/kjvs/H157`
        });
        await expect(service.get(source, 'G27')).rejects.toThrow('Dictionary chunk has no definition for: G27');
        await expect(service.get(source, 'G1')).rejects.toThrow('Dictionary definition is not installed: G1');
    });
});
