import { describe, expect, it, vi } from 'vitest';
import type { DictionaryChunk, DictionaryChunkMap } from '../../models/dictionary-chunk.model';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../../models/dictionary.model';

import { createDictionaryChunkMap } from '../../models/dictionary-chunk.model';
import { createDictionaryChunkObjectId } from '../../models/dictionary-chunk-identity';
import { DictionaryDefinitionRuntime } from './dictionary-definition-runtime';

const source = { publisher: 'publisher-a', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const other = { publisher: 'publisher-b', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const generation = 'm123';
const json = JSON.stringify({
	abandon: [{ word: 'ABANDON', content: '<p>leave</p>' }, { word: 'abandon', content: '<p>forsake</p>' }],
	ability: [{ word: 'ABILITY', content: '<p>power</p>' }]
});
const compressed = new Uint8Array([31, 139, 8]);

function makeFixture(options: {
	source?: DictionaryEditionSource;
	map?: DictionaryChunkMap;
	chunk?: DictionaryChunk;
	manifest?: DictionaryEditionManifest;
	decompress?: (bytes: Uint8Array) => Promise<string>;
} = {}) {
	const selected = options.source ?? source;
	const map = options.map ?? createDictionaryChunkMap(selected, generation, [
		{ chunkId: '0000', firstKey: 'abandon', lastKey: 'ability' }
	]);
	const chunk = options.chunk ?? {
		id: createDictionaryChunkObjectId(selected, generation, 0),
		source: selected, generation, chunkId: '0000', ordinal: 0,
		firstKey: 'abandon', lastKey: 'ability', uncompressedBytes: new TextEncoder().encode(json).length,
		compressedBytes: compressed.byteLength, gzip: compressed
	};
	const manifest = options.manifest ?? {
		id: 'publisher-a/webster-1828', edition: 'webster-1828', publisher: selected.publisher,
		resourceId: selected.resourceId, modifiedAt: 123, entryCount: 2,
		definitionFormat: 'webster-html',
		storageFormat: 'chunks-v1' as const, chunkGeneration: generation, chunkCount: 1
	};
	const editions = { getEdition: vi.fn(async () => manifest) };
	const chunks = {
		getMap: vi.fn(async () => map),
		getChunk: vi.fn(async () => chunk)
	};
	const decompress = vi.fn(options.decompress ?? (async () => json));
	return { editions, chunks, decompress, runtime: new DictionaryDefinitionRuntime(editions, chunks, decompress) };
}

describe('DictionaryDefinitionRuntime', () => {
	it('reads exactly one chunk and returns only the selected definitions', async () => {
		const { runtime, chunks, decompress } = makeFixture();
		const definitions = await runtime.get(source, 'abandon');
		expect(definitions).toEqual([
			{ word: 'ABANDON', content: '<p>leave</p>' },
			{ word: 'abandon', content: '<p>forsake</p>' }
		]);
		expect(JSON.stringify(definitions)).not.toContain('power');
		expect(chunks.getMap).toHaveBeenCalledWith(source, generation);
		expect(chunks.getChunk).toHaveBeenCalledWith(source, generation, 0);
		expect(decompress).toHaveBeenCalledTimes(1);
	});

	it('provides the selected value for worker-local normalization without transferring a chunk', async () => {
		const { runtime } = makeFixture();
		await expect(runtime.get(source, 'ability')).resolves.toEqual([
			{ word: 'ABILITY', content: '<p>power</p>' }
		]);
	});

	it('rejects missing and empty definition keys before reading chunks', async () => {
		const { runtime, chunks } = makeFixture();
		await expect(runtime.get(source, 'zebra')).rejects.toThrow('not installed');
		await expect(runtime.get(source, '')).rejects.toThrow('key cannot be empty');
		expect(chunks.getChunk).not.toHaveBeenCalled();
	});


	it("retrieves an opaque case-sensitive Strong's key without normalizing structured content", async () => {
		const strongs = { number: 'G26', originalWord: 'ἀγάπη', usageByWord: [{ word: 'love', count: 1 }] };
		const payload = JSON.stringify({ G26: strongs, H157: { number: 'H157' } });
		const selected = { publisher: 'publisher-a', resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' };
		const map = createDictionaryChunkMap(selected, generation, [
			{ chunkId: '0000', firstKey: 'G26', lastKey: 'H157' }
		]);
		const chunk: DictionaryChunk = {
			id: createDictionaryChunkObjectId(selected, generation, 0),
			source: selected, generation, chunkId: '0000', ordinal: 0,
			firstKey: 'G26', lastKey: 'H157', uncompressedBytes: new TextEncoder().encode(payload).length,
			compressedBytes: compressed.byteLength, gzip: compressed
		};
		const fixture = makeFixture({
			source: selected, map, chunk,
			manifest: {
				id: 'publisher-a/strongs-kjvs', edition: 'strongs-kjvs',
				publisher: selected.publisher, resourceId: selected.resourceId,
				modifiedAt: 123, entryCount: 2, definitionFormat: 'strongs', storageFormat: 'chunks-v1',
				chunkGeneration: generation, chunkCount: 1
			},
			decompress: async () => payload
		});
		await expect(fixture.runtime.get(selected, 'G26')).resolves.toEqual(strongs);
		await expect(fixture.runtime.get(selected, 'g26')).rejects.toThrow('not installed');
		expect(fixture.chunks.getChunk).toHaveBeenCalledOnce();
	});

	it('keeps lookup scoped to the selected publisher', async () => {
		const { runtime, chunks } = makeFixture({ source: other });
		await runtime.get(other, 'ability');
		expect(chunks.getChunk).toHaveBeenCalledWith(other, generation, 0);
	});

	it('does not expose an incomplete or incompatible generation', async () => {
		// Simulate corrupt persisted data despite the strict chunks-v1 model.
		const fixture = makeFixture({ manifest: { id: 'a', edition: 'webster-1828', publisher: source.publisher,
			resourceId: source.resourceId, modifiedAt: 123, entryCount: 2 } as DictionaryEditionManifest });
		await expect(fixture.runtime.get(source, 'abandon')).rejects.toThrow('not installed');
		expect(fixture.chunks.getMap).not.toHaveBeenCalled();
	});

	it('rejects mismatched chunk bounds before decompressing', async () => {
		const bad = makeFixture();
		const badChunk = { ...await bad.chunks.getChunk(), lastKey: 'abandon' };
		const fixture = makeFixture({ chunk: badChunk });
		await expect(fixture.runtime.get(source, 'ability')).rejects.toThrow('inconsistent');
		expect(fixture.decompress).not.toHaveBeenCalled();
	});

	it('rejects wrong uncompressed sizes and absent selected definitions', async () => {
		const tooShort = makeFixture({ decompress: async () => '{}' });
		await expect(tooShort.runtime.get(source, 'abandon')).rejects.toThrow('size');
		const wrongWord = makeFixture({ decompress: async () => json.replace('"abandon":', '"abondan":') });
		await expect(wrongWord.runtime.get(source, 'abandon')).rejects.toThrow(/size|no definition/);
	});

	it('rejects an inconsistent chunk count without loading compressed data', async () => {
		const original = makeFixture();
		const manifest = { ...await original.editions.getEdition(), chunkCount: 2 };
		const fixture = makeFixture({ manifest });
		await expect(fixture.runtime.get(source, 'abandon')).rejects.toThrow('count');
		expect(fixture.chunks.getChunk).not.toHaveBeenCalled();
	});
});
