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
import type { DictionaryEditionBundle } from '../../models/dictionary.model';
import type { DictionaryChunk } from '../../models/dictionary-chunk.model';
import { DICTIONARY_CHUNK_OBJECT_TYPE, DICTIONARY_CHUNK_MAP_OBJECT_TYPE } from '../../models/dictionary-chunk.model';
import { DictionaryChunkInstaller, type DictionaryChunkInstallationTiming } from './dictionary-chunk-installer';
import { DictionaryEntriesDataTypeHandler } from './dictionary-entries-data-type-handler';
import { WebsterDefinitionFormatValidator } from './webster-definition-format-validator';
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
		value: {
			definitionFormat: 'webster-html',
			headwords: words.map(word => ({ headword: word, key: word })),
			definitions: Object.fromEntries(words.map(word => [word, [{ word, content: `<p>${word} definition</p>` }]]))
		}
	};
}

/** Prepare exactly the published Document index for the fixture Resource. */
async function indexFor(resource: DecodedResourceContent) {
	const headwords = (resource.value as DictionaryEditionBundle).headwords;
	const index = new FlexSearch.Document({
		tokenize: 'forward', encode: false,
		document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
	});
	for (const { headword, key } of headwords) index.add({
		id: JSON.stringify([headword, key]), headword, key,
		searchableHeadword: Array.from(headword, c => c.codePointAt(0)!.toString(36).padStart(4, '0')).join(''),
		searchableKey: Array.from(key.toLowerCase(), c => c.codePointAt(0)!.toString(36).padStart(4, '0')).join('')
	});
	const chunks: Record<string, string> = {};
	await index.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
	return { resourceId: resource.resourceId, sourceSha256: 'a'.repeat(64),
		formatVersion: 1, tokenizer: 'forward' as const, encoding: 'codepoint-base36-padded4',
		headwordCount: headwords.length, chunks };
}

/** Exercise the real installer with a corresponding published index Resource. */
function handler(transaction: RecordingTransaction, pause: () => Promise<void> = async () => undefined,
	report: (timing: DictionaryChunkInstallationTiming) => void = () => undefined) {
	let published: Awaited<ReturnType<typeof indexFor>>;
	const actual = new DictionaryResourceHandler(new DictionaryEntriesDataTypeHandler([new WebsterDefinitionFormatValidator()]),
		new DictionaryChunkInstaller(transaction, { get: async () => published },
			async json => gzipSync(json), pause, report, 2, 85));
	return {
		async handle(input: DecodedResourceContent) {
			published = await indexFor(input);
			return actual.handle(input);
		}
	};
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
		expect(manifest).toMatchObject({ storageFormat: 'chunks-v1', definitionFormat: 'webster-html', chunkCount: chunks.length, entryCount: 5 });
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

	it('stores structured definitions by opaque IDs independently of searched words', async () => {
		const input = {
			...resource(),
			resourceId: createDictionaryResourceId('strongs-kjvs'),
			value: {
				definitionFormat: 'strongs',
				headwords: [
					{ headword: 'love', key: 'G25' },
					{ headword: 'love', key: 'G26' },
					{ headword: 'charity', key: 'G26' }
				],
				definitions: { G25: { number: 'G25' }, G26: { number: 'G26' } }
			}
		};
		const transaction = new RecordingTransaction();
		const published = await indexFor(input);
		const installer = new DictionaryChunkInstaller(transaction, { get: async () => published },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
		await installer.install(input, input.value);
		const definitions = Object.assign({}, ...transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE)
			.map(stored => JSON.parse(gunzipSync((stored.value as DictionaryChunk).gzip).toString('utf8'))));
		expect(definitions).toEqual(input.value.definitions);
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)[0]!.value).toMatchObject({ entryCount: 2, definitionFormat: 'strongs' });
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
			transaction, { get: async () => undefined }, compress, async () => undefined, timing => reports.push(timing), 2, 85
		);
		const older = resource(['z'], 100);
		await installer.install(older, older.value as DictionaryEditionBundle);
		expect(compress).not.toHaveBeenCalled();
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE).some(item => (item.value as DictionaryChunk).firstKey === 'z')).toBe(false);
		expect(reports).toMatchObject([{ status: 'older', chunks: 0, chunksWritten: 0, batchesCommitted: 0 }]);
	});

	it('reports interruption when compression fails before an edition is committed', async () => {
		const transaction = new RecordingTransaction();
		const reports: DictionaryChunkInstallationTiming[] = [];
		const installer = new DictionaryChunkInstaller(
			transaction, { get: async () => indexFor(resource()) }, async () => { throw new Error('compression failed'); },
			async () => undefined, timing => reports.push(timing), 2, 85
		);
		const input = resource();
		await expect(installer.install(input, input.value as DictionaryEditionBundle)).rejects.toThrow('compression failed');
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
	it('installs the published Document export unchanged', async () => {
		const input = resource(['a', 'aa']);
		const published = await indexFor(input);
		const get = vi.fn().mockResolvedValue(published);
		const transaction = new RecordingTransaction();
		const installer = new DictionaryChunkInstaller(transaction, { get },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
		await installer.install(input, input.value as DictionaryEditionBundle);
		expect(get).toHaveBeenCalledWith({ publisher: input.publisher, resourceId: input.resourceId });
		expect(transaction.find('dictionary/search-index')[0]?.value).toMatchObject({ chunks: published.chunks });
	});

	it('rejects an unavailable published index before writing definition chunks', async () => {
		const input = resource(['a', 'aa']);
		const transaction = new RecordingTransaction();
		const installer = new DictionaryChunkInstaller(transaction, { get: async () => undefined },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
		await expect(installer.install(input, input.value as DictionaryEditionBundle)).rejects.toThrow('not installed');
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE)).toHaveLength(0);
		expect(transaction.find(DICTIONARY_EDITION_OBJECT_TYPE)).toHaveLength(0);
	});

	it('rejects a stale published index before writing definition chunks', async () => {
		const input = resource(['a', 'aa']);
		const stale = await indexFor(resource(['a', 'ab']));
		const transaction = new RecordingTransaction();
		const installer = new DictionaryChunkInstaller(transaction, { get: async () => stale },
			async json => gzipSync(json), async () => undefined, () => undefined, 2, 85);
		await expect(installer.install(input, input.value as DictionaryEditionBundle)).rejects.toThrow('incompatible');
		expect(transaction.find(DICTIONARY_CHUNK_OBJECT_TYPE)).toHaveLength(0);
	});
});
