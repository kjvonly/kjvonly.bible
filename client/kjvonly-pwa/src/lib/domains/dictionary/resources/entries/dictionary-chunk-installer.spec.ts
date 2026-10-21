import { gzipSync, gunzipSync } from 'node:zlib';
import FlexSearch from 'flexsearch';
import { describe, expect, it, vi } from 'vitest';
import type { StoredDomainObject } from '$lib/infrastructure/persistence/application.db';
import type {
	DecodedResourceContent,
	GenericResourceInstallationStores,
	GenericResourceInstallationTransaction,
	ResourceInstallation
} from '$lib/resource';
import { createDictionaryResourceId } from '../../models/dictionary-identity';
import type { DictionaryEntriesBundle } from '../../models/dictionary.model';
import type { DictionaryChunk } from '../../models/dictionary-chunk.model';
import { DICTIONARY_CHUNK_OBJECT_TYPE, DICTIONARY_CHUNK_MAP_OBJECT_TYPE } from '../../models/dictionary-chunk.model';
import { DictionaryChunkInstaller, type DictionaryChunkInstallationTiming } from './dictionary-chunk-installer';
import { DictionaryEntriesDataTypeHandler } from './dictionary-entries-data-type-handler';
import { DictionaryResourceHandler } from './dictionary-resource-handler';
import { DICTIONARY_DATA_VERSION, DICTIONARY_ENTRIES_DATA_TYPE, DICTIONARY_EDITION_OBJECT_TYPE, DICTIONARY_RESOURCE_TYPE } from './dictionary-resource-contract';

/** In-memory atomic transaction simulator, including a failed-write rollback. */
class RecordingTransaction implements GenericResourceInstallationTransaction {
	readonly objects = new Map<string, StoredDomainObject>();
	readonly receipts = new Map<string, ResourceInstallation>();
	readonly writesPerBatch: number[] = [];
	failOnType?: string;

	async run<T>(operation: (stores: GenericResourceInstallationStores) => Promise<T>): Promise<T> {
		const writes: StoredDomainObject[] = [];
		const receipts: ResourceInstallation[] = [];
		const result = await operation({
			domainObjects: { put: async object => {
				if (object.objectType === this.failOnType) throw new Error('database write failed');
				writes.push(object);
			} },
			resourceInstallations: {
				get: async (type, id) => this.receipts.get(`${type}:${id}`),
				put: async receipt => { receipts.push(receipt); }
			}
		});
		for (const object of writes) this.objects.set(object.id, object);
		for (const receipt of receipts) this.receipts.set(receipt.id, receipt);
		this.writesPerBatch.push(writes.length);
		return result;
	}

	/** Retrieve records without depending on the underlying IndexedDB key format. */
	find(type: string): StoredDomainObject[] {
		return [...this.objects.values()].filter(item => item.objectType === type);
	}
}

/** Make a tiny valid published bundle; actual gzip compression is exercised in tests. */
function resource(words: readonly string[] = ['a', 'aa', 'ab', 'ac', 'ad'], modifiedAt = 100): DecodedResourceContent {
	return {
		publisher: 'publisher', resourceId: createDictionaryResourceId('webster-1828'),
		resourceType: DICTIONARY_RESOURCE_TYPE, dataType: DICTIONARY_ENTRIES_DATA_TYPE,
		dataVersion: DICTIONARY_DATA_VERSION, modifiedAt, mediaType: 'application/json',
		value: Object.fromEntries(words.map(word => [word, [{ word, content: `<p>${word} definition</p>` }]]))
	};
}

function handler(transaction: RecordingTransaction, pause: () => Promise<void> = async () => undefined,
	report: (timing: DictionaryChunkInstallationTiming) => void = () => undefined): DictionaryResourceHandler {
	return new DictionaryResourceHandler(new DictionaryEntriesDataTypeHandler(),
		new DictionaryChunkInstaller(transaction, undefined, async json => gzipSync(json), pause, report, 2, 85));
}

describe('Dictionary chunk installation', () => {
	it('commits a bounded number of compressed chunks and completes the edition last', async () => {
		const transaction = new RecordingTransaction();
		const pause = vi.fn(async () => undefined);
		await handler(transaction, pause).handle(resource());
		const chunks = transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE);
		expect(chunks.length).toBeGreaterThan(2);
		expect(transaction.writesPerBatch.slice(1, -1).every(count => count <= 2)).toBe(true);
		expect(transaction.writesPerBatch.at(-1)).toBe(3); // index + locator + manifest
		expect(transaction.find('dictionary/entry')).toHaveLength(0);
		expect(transaction.find(DICTIONARY_CHUNK_MAP_OBJECT_TYPE)).toHaveLength(1);
		const manifest = transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)[0]!.value;
		expect(manifest).toMatchObject({ storageFormat: 'chunks-v1', chunkCount: chunks.length, entryCount: 5 });
		const map = transaction.find(DICTIONARY_CHUNK_MAP_OBJECT_TYPE)[0]!.value as { ranges: { chunkId: string }[] };
		const merged = Object.assign({}, ...chunks.map(stored => {
			const chunk = stored.value as DictionaryChunk;
			const json = gunzipSync(chunk.gzip).toString('utf8');
			expect(new TextEncoder().encode(json).byteLength).toBe(chunk.uncompressedBytes);
			return JSON.parse(json);
		}));
		expect(Object.keys(merged).sort()).toEqual(['a', 'aa', 'ab', 'ac', 'ad']);
		expect(map.ranges).toHaveLength(chunks.length);
		expect(transaction.receipts.size).toBe(chunks.length + 3);
		expect(transaction.find('dictionary/search-index')).toHaveLength(1);
		expect(pause).toHaveBeenCalled();
	});

	it('does not expose an incomplete generation and retries without rewriting accepted chunks', async () => {
		const transaction = new RecordingTransaction();
		transaction.failOnType = DICTIONARY_CHUNK_MAP_OBJECT_TYPE;
		await expect(handler(transaction).handle(resource())).rejects.toThrow('database write failed');
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)).toHaveLength(0);
		expect(transaction.find(DICTIONARY_CHUNK_MAP_OBJECT_TYPE)).toHaveLength(0);
		expect(transaction.find('dictionary/search-index')).toHaveLength(0);
		const previousCount = transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE).length;
		expect(previousCount).toBeGreaterThan(0);
		transaction.failOnType = undefined;
		const timings: DictionaryChunkInstallationTiming[] = [];
		await handler(transaction, async () => undefined, info => timings.push(info)).handle(resource());
		expect(timings[0]).toMatchObject({ status: 'completed', chunksWritten: 0 });
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE)).toHaveLength(previousCount);
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)).toHaveLength(1);
	});

	it('keeps prior generations and prevents older Resource revisions from overwriting the manifest', async () => {
		const transaction = new RecordingTransaction();
		await handler(transaction).handle(resource(['a'], 101));
		const prior = transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE)[0]!;
		await handler(transaction).handle(resource(['b', 'c'], 102));
		expect(transaction.objects.has(prior.id)).toBe(true);
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)[0]!.value).toMatchObject({ modifiedAt: 102 });
		await handler(transaction).handle(resource(['z'], 100));
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)[0]!.value).toMatchObject({ modifiedAt: 102 });
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE).some(item => (item.value as DictionaryChunk).firstKey === 'z')).toBe(false);
	});

	it('reports an older Resource without compressing or writing chunks', async () => {
		const transaction = new RecordingTransaction();
		await handler(transaction).handle(resource(['a'], 101));
		const reports: DictionaryChunkInstallationTiming[] = [];
		const compress = vi.fn(async (json: string) => gzipSync(json));
		const installer = new DictionaryChunkInstaller(
			transaction, undefined, compress, async () => undefined, timing => reports.push(timing), 2, 85
		);
		const older = resource(['z'], 100);
		await installer.install(older, older.value as DictionaryEntriesBundle);
		expect(compress).not.toHaveBeenCalled();
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE).some(item => (item.value as DictionaryChunk).firstKey === 'z')).toBe(false);
		expect(reports).toMatchObject([{ status: 'older', chunks: 0, chunksWritten: 0, batchesCommitted: 0 }]);
	});

	it('reports interruption when compression fails before an edition is committed', async () => {
		const transaction = new RecordingTransaction();
		const reports: DictionaryChunkInstallationTiming[] = [];
		const installer = new DictionaryChunkInstaller(
			transaction, undefined, async () => { throw new Error('compression failed'); },
			async () => undefined, timing => reports.push(timing), 2, 85
		);
		const input = resource();
		await expect(installer.install(input, input.value as DictionaryEntriesBundle)).rejects.toThrow('compression failed');
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)).toHaveLength(0);
		expect(reports).toMatchObject([{ status: 'interrupted', chunks: 0, chunksWritten: 0, batchesCommitted: 0 }]);
	});

	it('does not report an accepted edition when the worker is interrupted between chunks', async () => {
		const transaction = new RecordingTransaction();
		await expect(handler(transaction, async () => { throw new Error('worker interrupted'); })
			.handle(resource())).rejects.toThrow('worker interrupted');
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)).toHaveLength(0);
		expect(transaction.find(DICTIONARY_CHUNK_MAP_OBJECT_TYPE)).toHaveLength(0);
		expect(transaction.find('dictionary/search-index')).toHaveLength(0);
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE).length).toBeGreaterThan(0);
	});
	it('imports a compatible published index instead of rebuilding it', async () => {
		const bundle = resource(['a', 'aa']);
		const source = { publisher: bundle.publisher, resourceId: bundle.resourceId };
		const publishedIndex = new FlexSearch.Index({ tokenize: 'forward', encode: false });
		for (const word of ['a', 'aa']) {
			publishedIndex.add(word, Array.from(word, character => character.codePointAt(0)!.toString(36).padStart(4, '0')).join(''));
		}
		const chunks: Record<string, string> = {};
		await publishedIndex.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
		const get = vi.fn().mockResolvedValue({
			resourceId: source.resourceId, sourceSha256: 'a'.repeat(64),
			formatVersion: 1, tokenizer: 'forward', encoding: 'codepoint-base36-padded4',
			headwordCount: 2, chunks
		});
		const transaction = new RecordingTransaction();
		const installer = new DictionaryChunkInstaller(transaction, { get },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
		await installer.install(bundle, bundle.value as DictionaryEntriesBundle);
		expect(get).toHaveBeenCalledWith(source);
		expect(transaction.find('dictionary/search-index')[0]?.value).toMatchObject({ chunks });
	});

	it('rebuilds locally if a published index is missing or has an incompatible export', async () => {
		for (const getMatching of [
			vi.fn().mockResolvedValue(undefined),
			vi.fn().mockResolvedValue({ headwordCount: 2, chunks: { bad: '{' } }),
			vi.fn().mockRejectedValue(new Error('published index unavailable'))
		]) {
			const transaction = new RecordingTransaction();
			const installer = new DictionaryChunkInstaller(transaction, { get: getMatching },
				async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
			const input = resource(['a', 'aa']);
			await installer.install(input, input.value as DictionaryEntriesBundle);
			const persisted = transaction.find('dictionary/search-index')[0];
			expect(persisted).toBeDefined();
			expect(persisted!.value).toMatchObject({ headwordCount: 2, sourceRevision: 100 });
			expect(getMatching).toHaveBeenCalledWith({ publisher: input.publisher, resourceId: input.resourceId });
		}
	});

	it('falls back when a same-count published index contains stale headwords', async () => {
		const oldIndex = new FlexSearch.Index({ tokenize: 'forward', encode: false });
		oldIndex.add('a', '002p');
		oldIndex.add('ab', '002p002q');
		const chunks: Record<string, string> = {};
		await oldIndex.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
		const get = vi.fn().mockResolvedValue({ headwordCount: 2, chunks });
		const transaction = new RecordingTransaction();
		const input = resource(['a', 'aa']);
		await new DictionaryChunkInstaller(transaction, { get },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85)
			.install(input, input.value as DictionaryEntriesBundle);
		const stored = transaction.find('dictionary/search-index')[0]!.value as { chunks: Record<string, string> };
		const rebuilt = new FlexSearch.Index({ tokenize: 'forward', encode: false });
		for (const [key, data] of Object.entries(stored.chunks)) await rebuilt.import(key, data);
		expect(rebuilt.contain('aa')).toBe(true);
		expect(rebuilt.contain('ab')).toBe(false);
	});

});
