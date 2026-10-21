import FlexSearch from 'flexsearch';
import { describe, expect, it, vi } from 'vitest';
import {
	createDictionaryHeadwordIndexId,
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	encodeHeadwordForSearch
} from '../models/dictionary-headword-index.model';
import type { DictionaryEntriesBundle } from '../models/dictionary.model';
import type { DictionaryPublishedHeadwordIndex } from '../models/dictionary-published-headword-index.model';
import type { DictionaryPublishedIndexStore } from '../persistence/dictionary-published-index-store';
import { createDictionaryHeadwordIndex } from './dictionary-headword-index-builder';

const source = {
	publisher: 'publisher',
	resourceId: 'kjvonly/dictionary/entries/webster-1828'
};

/** Definitions must never be added to the headword-only FlexSearch export. */
function bundle(words: readonly string[]): DictionaryEntriesBundle {
	return Object.fromEntries(words.map(word => [word, [{ word, content: `<p>${word} definition</p>` }]]));
}

/** Build a real portable export using the same v1 encoding as the publishing script. */
async function exportHeadwords(words: readonly string[]): Promise<Record<string, string>> {
	const index = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
	for (const word of words) index.add(word, encodeHeadwordForSearch(word));
	const chunks: Record<string, string> = {};
	await index.export((key: string, data: string | undefined) => {
		chunks[key] = data ?? '';
	});
	return chunks;
}

async function importedIndex(chunks: Readonly<Record<string, string>>) {
	const index = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
	for (const [key, value] of Object.entries(chunks)) await index.import(key, value);
	return index;
}

async function publishedIndex(words: readonly string[]): Promise<DictionaryPublishedHeadwordIndex> {
	return {
		resourceId: source.resourceId,
		sourceSha256: 'a'.repeat(64),
		formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
		tokenizer: DICTIONARY_HEADWORD_INDEX_TOKENIZER,
		encoding: 'codepoint-base36-padded4',
		headwordCount: words.length,
		chunks: await exportHeadwords(words)
	};
}

describe('Dictionary headword index builder', () => {
	it('generates a usable local index with the selected Resource identity and revision', async () => {
		const result = await createDictionaryHeadwordIndex(source, 123, bundle(['a', 'a b', 'é']), undefined);
		expect(result).toMatchObject({
			...source,
			id: createDictionaryHeadwordIndexId(source),
			sourceRevision: 123,
			formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
			headwordCount: 3
		});
		const index = await importedIndex(result.chunks);
		for (const word of ['a', 'a b', 'é']) expect(index.contain(word)).toBe(true);
		expect(index.contain('absent')).toBe(false);
	});

	it('reuses a compatible published export without rebuilding it', async () => {
		const published = await publishedIndex(['a', 'aa']);
		const get = vi.fn(async () => published);
		const result = await createDictionaryHeadwordIndex(source, 124, bundle(['a', 'aa']), { get });
		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith(source);
		expect(result.chunks).toBe(published.chunks);
		expect(result.sourceRevision).toBe(124);
	});

	it('rejects a published export with a mismatched headword count', async () => {
		const published = await publishedIndex(['a']);
		const result = await createDictionaryHeadwordIndex(source, 125, bundle(['a', 'aa']), {
			get: async () => published
		});
		expect(result.chunks).not.toBe(published.chunks);
		const index = await importedIndex(result.chunks);
		expect(index.contain('aa')).toBe(true);
	});

	it('rejects a same-count published export containing stale headwords', async () => {
		const published = await publishedIndex(['a', 'ab']);
		const result = await createDictionaryHeadwordIndex(source, 126, bundle(['a', 'aa']), {
			get: async () => published
		});
		expect(result.chunks).not.toBe(published.chunks);
		const index = await importedIndex(result.chunks);
		expect(index.contain('aa')).toBe(true);
		expect(index.contain('ab')).toBe(false);
	});

	it('falls back locally for absent, malformed, or unavailable published exports', async () => {
		const malformed = { ...(await publishedIndex(['a', 'aa'])), chunks: { bad: '{' } };
		const stores: DictionaryPublishedIndexStore[] = [
			{ get: async () => undefined },
			{ get: async () => malformed },
			{ get: async () => { throw new Error('published index unavailable'); } }
		];
		for (const store of stores) {
			const result = await createDictionaryHeadwordIndex(source, 127, bundle(['a', 'aa']), store);
			const index = await importedIndex(result.chunks);
			expect(index.contain('a')).toBe(true);
			expect(index.contain('aa')).toBe(true);
		}
	});
});
