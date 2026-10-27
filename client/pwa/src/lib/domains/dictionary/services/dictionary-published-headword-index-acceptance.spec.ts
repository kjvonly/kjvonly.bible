import FlexSearch from 'flexsearch';
import { describe, expect, it, vi } from 'vitest';
import {
	createDictionaryHeadwordIndexId,
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	encodeHeadwordForSearch
} from '../models/dictionary-headword-index.model';
import type { DictionaryEditionBundle } from '../models/dictionary.model';
import type { DictionaryPublishedHeadwordIndex } from '../models/dictionary-published-headword-index.model';
import { acceptPublishedDictionaryHeadwordIndex } from './dictionary-published-headword-index-acceptance';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

function bundle(words: readonly string[]): DictionaryEditionBundle {
	return {
		definitionFormat: 'webster-html',
		headwords: words.map(word => ({ headword: word, key: word })),
		definitions: Object.fromEntries(words.map(word => [word, [{ word, content: `<p>${word}</p>` }]]))
	};
}

/** The publishing script creates these records; production Resource workers never do. */
async function publishedIndex(words: readonly string[]): Promise<DictionaryPublishedHeadwordIndex> {
	const index = new FlexSearch.Document({
		tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false,
		document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
	});
	for (const word of words) {
		index.add({ id: JSON.stringify([word, word]), headword: word, key: word, searchableHeadword: encodeHeadwordForSearch(word), searchableKey: encodeHeadwordForSearch(word) });
	}
	const chunks: Record<string, string> = {};
	await index.export((key: string, data: string | undefined) => { chunks[key] = data ?? ''; });
	return { resourceId: source.resourceId, sourceSha256: 'a'.repeat(64),
		formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
		tokenizer: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encoding: 'codepoint-base36-padded4',
		headwordCount: words.length, chunks };
}

describe('Dictionary published headword index acceptance', () => {
	it('persists a complete published index without generating a replacement', async () => {
		const published = await publishedIndex(['a', 'a b', 'é']);
		const get = vi.fn(async () => published);
		const result = await acceptPublishedDictionaryHeadwordIndex(source, 123, bundle(['a', 'a b', 'é']), { get });
		expect(get).toHaveBeenCalledExactlyOnceWith(source);
		expect(result).toMatchObject({ ...source, id: createDictionaryHeadwordIndexId(source),
			sourceRevision: 123, formatVersion: 1, headwordCount: 3 });
		expect(result.chunks).toBe(published.chunks);
	});

	it('rejects a missing published index instead of building one locally', async () => {
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 124, bundle(['a']), { get: async () => undefined }))
			.rejects.toThrow('not installed');
	});

	it('rejects mismatched counts and same-count stale headwords', async () => {
		const a = await publishedIndex(['a']);
		const b = await publishedIndex(['a', 'ab']);
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 125, bundle(['a', 'aa']), { get: async () => a }))
			.rejects.toThrow('does not match');
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 125, bundle(['a', 'aa']), { get: async () => b }))
			.rejects.toThrow('incompatible');
	});

	it('checks each (headword, key) association rather than distinct headwords', async () => {
		const published = await publishedIndex(['love']);
		const candidate: DictionaryEditionBundle = {
			definitionFormat: 'webster-html',
			headwords: [{ headword: 'love', key: 'G26' }],
			definitions: { G26: [{ word: 'love', content: '<p>test</p>' }] }
		};
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 123, candidate, { get: async () => published }))
			.rejects.toThrow('incompatible');
	});

	it('rejects corrupt published exports and propagates read failures', async () => {
		const invalid = { ...(await publishedIndex(['a'])), chunks: { cfg: '{invalid' } };
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 127, bundle(['a']), { get: async () => invalid }))
			.rejects.toThrow('incompatible');
		await expect(acceptPublishedDictionaryHeadwordIndex(source, 127, bundle(['a']), {
			get: async () => { throw new Error('index store unavailable'); }
		})).rejects.toThrow('index store unavailable');
	});
});
