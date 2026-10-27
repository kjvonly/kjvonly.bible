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
	const index = new FlexSearch.Document({
		tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false,
		document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
	});
	for (const word of words) index.add({
		id: JSON.stringify([word, word]), headword: word, key: word,
		searchableHeadword: encodeHeadwordForSearch(word), searchableKey: encodeHeadwordForSearch(word)
	});
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
				definitionFormat: 'webster-html',
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
		expect((await runtime.search('ab', a)).map(m => m.headword)).toEqual(['abandon']);
		expect((await runtime.search('ab', b)).map(m => m.headword)).toEqual(['abacus']);
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
		expect((await runtime.search('ab', a)).map(m => [m.publisher, m.headword])).toEqual([['publisher', 'abandon']]);
		expect((await runtime.search('ab', other)).map(m => [m.publisher, m.headword])).toEqual([['other-publisher', 'abacus']]);
		expect(f.reads).toHaveLength(2);
	});

	it('finds only complete headword prefixes including multiword beginnings', async () => {
		const f = fixture();
		await f.install(a, ['abandon', 'old testament', 'test']);
		const runtime = f.createRuntime();
		expect((await runtime.search('aba', a)).map(m => m.headword)).toEqual(['abandon']);
		expect(await runtime.search('band', a)).toEqual([]);
		expect((await runtime.search('old t', a)).map(m => m.headword)).toEqual(['old testament']);
		expect(await runtime.search('testament', a)).toEqual([]);
	});

	it('returns every matching headword without a result cap', async () => {
		const f = fixture();
		await f.install(a, Array.from({ length: 750 }, (_, i) => `aa${String(i).padStart(3, '0')}`));
		const matches = await f.createRuntime().search('aa', a);
		expect(matches).toHaveLength(750);
		expect(matches[0]?.headword).toBe('aa000');
		expect(matches.at(-1)?.headword).toBe('aa749');
	});

	it('orders exact matches first, then prefixes, retaining their source identity', async () => {
		const f = fixture();
		await f.install(a, ['abandon', 'ab', 'abacus']);
		const matches = await f.createRuntime().search('ab', a);
		expect(matches).toEqual(['ab', 'abacus', 'abandon'].map(headword => ({
			...a, headword, key: headword
		})));
	});

	it('searches all associations when their count differs from the definition count', async () => {
		const f = fixture();
		await f.install(a, ['love', 'charity', 'beloved']);
		const index = new FlexSearch.Document({
			tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false,
			document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
		});
		for (const [headword, key] of [['love', 'G25'], ['love', 'G26'], ['charity', 'G26']] as const) {
			index.add({ id: JSON.stringify([headword, key]), headword, key,
				searchableHeadword: encodeHeadwordForSearch(headword),
				searchableKey: encodeHeadwordForSearch(key.toLowerCase()) });
		}
		const chunks: Record<string, string> = {};
		await index.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
		const id = createDictionaryHeadwordIndexId(a);
		// Three searchable associations reference just two distinct definitions.
		f.editions.set(id, { ...f.editions.get(id)!, entryCount: 2 });
		f.indexes.set(id, { ...f.indexes.get(id)!, chunks });
		const runtime = f.createRuntime();
		expect(await runtime.search('love', a)).toEqual([
			{ ...a, headword: 'love', key: 'G25' },
			{ ...a, headword: 'love', key: 'G26' }
		]);
		// A previously loaded index must remain reusable for the same edition revision.
		expect(await runtime.search('charity', a)).toEqual([
			{ ...a, headword: 'charity', key: 'G26' }
		]);
		expect(f.reads).toHaveLength(1);

		// Definitions without searchable headwords must not invalidate the index either.
		await f.install(b, ['abacus']);
		const otherId = createDictionaryHeadwordIndexId(b);
		f.editions.set(otherId, { ...f.editions.get(otherId)!, entryCount: 4 });
		expect((await runtime.search('aba', b)).map(match => match.headword)).toEqual(['abacus']);
	});

	it('searches Strong’s IDs and headwords from one imported index without duplicate results', async () => {
		const f = fixture();
		const strongs = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' };
		await f.install(strongs, ['alpha', 'another', 'beginning', 'alphabet']);
		const index = new FlexSearch.Document({
			tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false,
			document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
		});
		for (const [headword, key] of [
			['alpha', 'G1'], ['another', 'G1'], ['beginning', 'H1'], ['alphabet', 'G10']
		] as const) {
			index.add({ id: JSON.stringify([headword, key]), headword, key,
				searchableHeadword: encodeHeadwordForSearch(headword),
				searchableKey: encodeHeadwordForSearch(key.toLowerCase()) });
		}
		const chunks: Record<string, string> = {};
		await index.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
		const id = createDictionaryHeadwordIndexId(strongs);
		f.indexes.set(id, { ...f.indexes.get(id)!, chunks });
		const runtime = f.createRuntime();
		expect((await runtime.search('G1', strongs)).map(({ headword, key }) => [headword, key])).toEqual([
			['alpha', 'G1'], ['another', 'G1'], ['alphabet', 'G10']
		]);
		expect((await runtime.search('h1', strongs)).map(({ headword, key }) => [headword, key]))
			.toEqual([['beginning', 'H1']]);
		expect((await runtime.search('alpha', strongs)).map(({ headword, key }) => [headword, key]))
			.toEqual([['alpha', 'G1'], ['alphabet', 'G10']]);
		expect((await runtime.search('another', strongs)).map(({ headword, key }) => [headword, key]))
			.toEqual([['another', 'G1']]);
	});

	it('rejects missing and incompatible accepted indexes without silently hiding errors', async () => {
		const f = fixture();
		await f.install(a, ['abandon']);
		await f.install(b, ['abacus']);
		f.indexes.delete(createDictionaryHeadwordIndexId(b));
		const runtime = f.createRuntime();
		await expect(runtime.search('ab', b)).rejects.toThrow('missing or incompatible');
		expect((await runtime.search('ab', a)).map(m => m.headword)).toEqual(['abandon']);
	});

	it('rejects corrupt exports instead of rebuilding', async () => {
		const f = fixture();
		await f.install(a, ['abandon']);
		const id = createDictionaryHeadwordIndexId(a);
		f.indexes.set(id, { ...f.indexes.get(id)!, chunks: { cfg: '{invalid-json' } });
		await expect(f.createRuntime().search('ab', a)).rejects.toThrow('could not be imported');
	});

	it('reloads a new accepted revision instead of using an older in-memory index', async () => {
		const f = fixture();
		await f.install(a, ['aam']);
		const runtime = f.createRuntime();
		expect(await runtime.search('aa', a)).toHaveLength(1);
		await f.install(a, ['abandon'], 2);
		expect((await runtime.search('ab', a)).map(m => m.headword)).toEqual(['abandon']);
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
