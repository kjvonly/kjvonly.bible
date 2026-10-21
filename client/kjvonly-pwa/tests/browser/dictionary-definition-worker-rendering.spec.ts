import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from 'svelte';
import FlexSearch from 'flexsearch';
import { NormalizedContentRenderer } from '$lib/domains/normalized-content/ui';
import {
    DOMAIN_OBJECTS,
    createStoredDomainObjectId,
    getApplicationDB,
    type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';
import {
    DICTIONARY_CHUNK_MAP_OBJECT_TYPE,
    DICTIONARY_CHUNK_OBJECT_TYPE,
    type DictionaryChunk
} from '$lib/domains/dictionary/models/dictionary-chunk.model';
import {
    createDictionaryChunkMapObjectId,
    createDictionaryChunkObjectId,
    createDictionaryChunkGeneration
} from '$lib/domains/dictionary/models/dictionary-chunk-identity';
import { createDictionaryEditionId } from '$lib/domains/dictionary/models/dictionary-identity';
import {
    createDictionaryHeadwordIndexId,
    encodeHeadwordForSearch,
    DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
    DICTIONARY_HEADWORD_INDEX_TOKENIZER
} from '$lib/domains/dictionary/models/dictionary-headword-index.model';
import {
    DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE,
    DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
    DICTIONARY_HEADWORD_INDEX_DATA_VERSION
} from '$lib/domains/dictionary/persistence/dictionary-headword-index-store';
import { createBrowserDictionarySearchWorkerClient, type DictionarySearchWorkerClient } from '$lib/domains/dictionary/workers/search/dictionary-search-worker-client';
import {
    DICTIONARY_CHUNK_DATA_TYPE,
    DICTIONARY_CHUNK_MAP_DATA_TYPE,
    DICTIONARY_CHUNK_DATA_VERSION,
    DICTIONARY_DATA_VERSION,
    DICTIONARY_EDITION_DATA_TYPE,
    DICTIONARY_EDITION_OBJECT_TYPE
} from '$lib/domains/dictionary/resources/entries/dictionary-resource-contract';
import { createDictionaryChunkMap } from '$lib/domains/dictionary/models/dictionary-chunk.model';
import {
    createBrowserDictionaryDefinitionWorkerClient,
    type DictionaryDefinitionWorkerClient
} from '$lib/domains/dictionary/workers/definition/dictionary-definition-worker-client';

/** Browser integration: real IndexedDB, gzip, Worker transport, HTML normalization, and renderer. */
const source = {
    publisher: `dictionary-definition-browser-${crypto.randomUUID()}`,
    resourceId: 'kjvonly/dictionary/entries/webster-1828'
};
const edition = 'webster-1828';
const revision = 123;
const generation = createDictionaryChunkGeneration(revision);
const keysToClean: string[] = [];
let client: DictionaryDefinitionWorkerClient | undefined;
let searchClient: DictionarySearchWorkerClient | undefined;
let target: HTMLDivElement | undefined;
let mounted: ReturnType<typeof mount> | undefined;

/** Compress an actual keyed dictionary chunk using the browser gzip implementation. */
async function gzip(json: string): Promise<Uint8Array> {
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Store a fixture Domain object using the same envelope as production installation. */
function record(objectType: string, objectId: string, dataType: string, dataVersion: number, value: unknown): StoredDomainObject {
    const id = createStoredDomainObjectId(objectType, objectId);
    keysToClean.push(id);
    return { id, objectType, objectId, dataType, dataVersion, value };
}

/** Install exactly one accepted generation; no Resource download or app bootstrap needed. */
async function installFixture(): Promise<void> {
    const definitions = {
        aam: [
            { word: 'AAM', content: '<div><p><b>AAM</b>, <i>noun</i> a Dutch liquid measure.</p></div>' },
            { word: 'AAM', content: '<p>A second ordered definition.</p>' }
        ],
        aamish: [{ word: 'AAMISH', content: '<p>This unrelated entry must not be transferred.</p>' }]
    };
    const json = JSON.stringify(definitions);
    const bytes = new TextEncoder().encode(json);
    const compressed = await gzip(json);
    const chunkId = '0000';
    const chunkObjectId = createDictionaryChunkObjectId(source, generation, 0);
    const mapObjectId = createDictionaryChunkMapObjectId(source, generation);
    const chunk: DictionaryChunk = {
        id: chunkObjectId, source, generation, chunkId, ordinal: 0,
        firstKey: 'aam', lastKey: 'aamish',
        gzip: compressed, compressedBytes: compressed.byteLength,
        uncompressedBytes: bytes.byteLength
    };
    const map = createDictionaryChunkMap(source, generation, [
        { chunkId, firstKey: 'aam', lastKey: 'aamish' }
    ]);
    const editionId = createDictionaryEditionId(source.publisher, edition);
    const manifest = {
        id: editionId, publisher: source.publisher, resourceId: source.resourceId,
        edition, modifiedAt: revision, entryCount: 2,
        storageFormat: 'chunks-v1' as const, chunkGeneration: generation, chunkCount: 1
    };

    // This is the same forward-prefix export contract used by Dictionary installation.
    const index = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
    for (const headword of Object.keys(definitions)) index.add(headword, encodeHeadwordForSearch(headword));
    const chunks: Record<string, string> = {};
    await index.export((key: string, value: string | undefined) => { chunks[key] = value ?? ''; });
    const persistedIndex = {
        ...source,
        id: createDictionaryHeadwordIndexId(source),
        sourceRevision: revision,
        formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
        headwordCount: 2,
        chunks
    };

    const records = [
        record(DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE, persistedIndex.id,
            DICTIONARY_HEADWORD_INDEX_DATA_TYPE, DICTIONARY_HEADWORD_INDEX_DATA_VERSION, persistedIndex),
        record(DICTIONARY_CHUNK_OBJECT_TYPE, chunkObjectId, DICTIONARY_CHUNK_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION, chunk),
        record(DICTIONARY_CHUNK_MAP_OBJECT_TYPE, mapObjectId, DICTIONARY_CHUNK_MAP_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION, map),
        record(DICTIONARY_EDITION_OBJECT_TYPE, editionId, DICTIONARY_EDITION_DATA_TYPE, DICTIONARY_DATA_VERSION, manifest)
    ];
    const db = await getApplicationDB();
    const transaction = db.transaction(DOMAIN_OBJECTS, 'readwrite');
    for (const value of records) void transaction.store.put(value);
    await transaction.done;
}

afterEach(async () => {
    client?.dispose();
    client = undefined;
    searchClient?.dispose();
    searchClient = undefined;
    if (mounted) await unmount(mounted);
    mounted = undefined;
    target?.remove();
    target = undefined;
    if (keysToClean.length) {
        const db = await getApplicationDB();
        const transaction = db.transaction(DOMAIN_OBJECTS, 'readwrite');
        for (const id of keysToClean) void transaction.store.delete(id);
        await transaction.done;
        keysToClean.length = 0;
    }
});

describe('Dictionary search → selected-definition workers → Normalized Content renderer', () => {
    it('searches headwords, loads only the selected chunk off-thread, and renders its formatting', async () => {
        await installFixture();
        searchClient = createBrowserDictionarySearchWorkerClient();
        client = createBrowserDictionaryDefinitionWorkerClient();

        // A proxied source reproduces the Svelte state boundary that previously broke postMessage.
        const reactiveSource = new Proxy({ ...source }, {});
        const search = await searchClient.search('aa', reactiveSource);
        expect(search.matches).toHaveLength(2);
        expect(search.matches.map(match => match.headwordKey)).toEqual(['aam', 'aamish']);
        const selected = search.matches[0]!;
        const document = await client.getNormalized(new Proxy({ ...selected }, {}), selected.headwordKey);
        expect(document.blocks).toHaveLength(2);

        target = documentTarget();
        mounted = mount(NormalizedContentRenderer, { target, props: { document } });
        await vi.waitFor(() => expect(target?.querySelectorAll('article p').length).toBe(2));
        expect(target?.querySelector('strong')?.textContent).toBe('AAM');
        expect(target?.querySelector('em')?.textContent).toBe('noun');
        expect(target?.textContent).toContain('A second ordered definition.');
        expect(target?.textContent).not.toContain('unrelated entry');
        expect(target?.textContent).not.toContain('<div>');
    });

    it('does not borrow a definition from a different publisher or another headword', async () => {
        await installFixture();
        client = createBrowserDictionaryDefinitionWorkerClient();
        await expect(client.getNormalized({ ...source, publisher: 'different-publisher' }, 'aam'))
            .rejects.toThrow('not installed');
        await expect(client.getNormalized(source, 'missing'))
            .rejects.toThrow('not installed');
    });
});

/** Own the rendered fixture DOM; never mount the Dictionary UI into the application shell. */
function documentTarget(): HTMLDivElement {
    const element = document.createElement('div');
    document.body.append(element);
    return element;
}
