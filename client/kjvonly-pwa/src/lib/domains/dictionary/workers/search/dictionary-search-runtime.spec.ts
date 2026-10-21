import FlexSearch from 'flexsearch';
import { describe, expect, it } from 'vitest';
import { createDictionaryHeadwordIndexId, DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION, DICTIONARY_HEADWORD_INDEX_TOKENIZER, type DictionaryHeadwordIndex } from '../../models/dictionary-headword-index.model';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../../models/dictionary.model';

import type { DictionaryHeadwordIndexStore } from '../../persistence/dictionary-headword-index-store';
import type { DictionaryHeadwordSourceStore } from '../../persistence/dictionary-headword-source-store';
import { encodeHeadwordForSearch } from '../../models/dictionary-headword-index.model';
import { DictionarySearchRuntime } from './dictionary-search-runtime';

const a = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const b = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1844' };

/** Produces the same headword-only FlexSearch export as Dictionary installation. */
async function installedIndex(source: DictionaryEditionSource, words: readonly string[], revision = 1): Promise<DictionaryHeadwordIndex> {
	const index = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
	for (const word of words) index.add(word, encodeHeadwordForSearch(word));
	const chunks: Record<string, string> = {};
	await index.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
	return {
		...source, id: createDictionaryHeadwordIndexId(source),
		sourceRevision: revision, formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
		headwordCount: words.length, chunks
	};
}

/** In-memory stores model a completed chunked edition and its persisted index. */
function fixture() {
	const editions = new Map<string, DictionaryEditionManifest>();
	const indexes = new Map<string, DictionaryHeadwordIndex>();
	const reads: string[] = [];
	const sources: DictionaryHeadwordSourceStore = {
		listEditions: async () => [],
		async getEdition(source) { return editions.get(createDictionaryHeadwordIndexId(source)); }
	};
	const cache: DictionaryHeadwordIndexStore = {
		async get(source, revision) {
			const id = createDictionaryHeadwordIndexId(source);
			reads.push(id);
			const stored = indexes.get(id);
			return stored?.sourceRevision === revision ? stored : undefined;
		}
	};
	return {
		editions, indexes, reads,
		createRuntime: () => new DictionarySearchRuntime(sources, cache),
		async install(source: DictionaryEditionSource, words: readonly string[], revision = 1) {
			const id = createDictionaryHeadwordIndexId(source);
			editions.set(id, {
				id, edition: source.resourceId.split('/').at(-1)!, publisher: source.publisher,
				resourceId: source.resourceId, modifiedAt: revision, entryCount: words.length,
				storageFormat: 'chunks-v1', chunkGeneration: `m${revision}`, chunkCount: 1
			});
			indexes.set(id, await installedIndex(source, words, revision));
		}
	};
}

describe('DictionarySearchRuntime with installed chunk indexes', () => {
	it('searches one selected edition at a time while caching both indexes in one worker', async () => {
		const f = fixture();
		await f.install(a, ['a', 'abandon', 'old testament']);
		await f.install(b, ['a', 'abacus', 'alpha']);
		const runtime = f.createRuntime();
		expect((await runtime.search('ab', a)).map(m => m.headwordKey)).toEqual(['abandon']);
		expect((await runtime.search('ab', b)).map(m => m.headwordKey)).toEqual(['abacus']);
		expect(f.reads).toHaveLength(2);
		await runtime.search('a', a);
		expect(f.reads).toHaveLength(2);
	});

	it('isolates editions from different publishers that use the same Resource ID', async () => {
		const f = fixture();
		const other = { ...a, publisher: 'other-publisher' };
		await f.install(a, ['abandon']);
		await f.install(other, ['abacus']);
		const runtime = f.createRuntime();
		expect((await runtime.search('ab', a)).map(m => [m.publisher, m.headwordKey])).toEqual([['publisher', 'abandon']]);
		expect((await runtime.search('ab', other)).map(m => [m.publisher, m.headwordKey])).toEqual([['other-publisher', 'abacus']]);
		expect(f.reads).toHaveLength(2);
	});

	it('finds only complete headword prefixes including multiword beginnings', async () => {
		const f = fixture();
		await f.install(a, ['abandon', 'old testament', 'test']);
		const runtime = f.createRuntime();
		expect((await runtime.search('aba', a)).map(m => m.headwordKey)).toEqual(['abandon']);
		expect(await runtime.search('band', a)).toEqual([]);
		expect((await runtime.search('old t', a)).map(m => m.headwordKey)).toEqual(['old testament']);
		expect(await runtime.search('testament', a)).toEqual([]);
	});

	it('returns every matching headword without a result cap', async () => {
		const f = fixture();
		await f.install(a, Array.from({ length: 750 }, (_, i) => `aa${String(i).padStart(3, '0')}`));
		const matches = await f.createRuntime().search('aa', a);
		expect(matches).toHaveLength(750);
		expect(matches[0]?.headwordKey).toBe('aa000');
		expect(matches.at(-1)?.headwordKey).toBe('aa749');
	});

	it('orders exact matches first, then prefixes, retaining their source identity', async () => {
		const f = fixture();
		await f.install(a, ['abandon', 'ab', 'abacus']);
		const matches = await f.createRuntime().search('ab', a);
		expect(matches).toEqual(['ab', 'abacus', 'abandon'].map(headwordKey => ({
			...a, headwordKey
		})));
	});

	it('rejects missing and incompatible accepted indexes without silently hiding errors', async () => {
		const f = fixture();
		await f.install(a, ['abandon']);
		await f.install(b, ['abacus']);
		f.indexes.delete(createDictionaryHeadwordIndexId(b));
		const runtime = f.createRuntime();
		await expect(runtime.search('ab', b)).rejects.toThrow('missing or incompatible');
		expect((await runtime.search('ab', a)).map(m => m.headwordKey)).toEqual(['abandon']);
	});

	it('rejects incorrect headword counts and corrupt exports instead of rebuilding', async () => {
		const f = fixture();
		await f.install(a, ['abandon']);
		const id = createDictionaryHeadwordIndexId(a);
		f.indexes.set(id, { ...f.indexes.get(id)!, headwordCount: 2 });
		await expect(f.createRuntime().search('ab', a)).rejects.toThrow('missing or incompatible');
		f.indexes.set(id, { ...f.indexes.get(id)!, headwordCount: 1, chunks: { cfg: '{invalid-json' } });
		await expect(f.createRuntime().search('ab', a)).rejects.toThrow('could not be imported');
	});

	it('reloads a new accepted revision instead of using an older in-memory index', async () => {
		const f = fixture();
		await f.install(a, ['aam']);
		const runtime = f.createRuntime();
		expect(await runtime.search('aa', a)).toHaveLength(1);
		await f.install(a, ['abandon'], 2);
		expect((await runtime.search('ab', a)).map(m => m.headwordKey)).toEqual(['abandon']);
		expect(f.reads).toHaveLength(2);
	});

	it('returns nothing for an empty query and rejects overlong queries before importing indexes', async () => {
		const f = fixture();
		await f.install(a, ['abandon']);
		const runtime = f.createRuntime();
		expect(await runtime.search('', a)).toEqual([]);
		await expect(runtime.search('a'.repeat(257), a)).rejects.toThrow('too long');
		expect(f.reads).toHaveLength(0);
	});
});
