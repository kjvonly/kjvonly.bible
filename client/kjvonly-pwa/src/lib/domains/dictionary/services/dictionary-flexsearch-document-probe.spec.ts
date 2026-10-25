import FlexSearch from 'flexsearch';
import { describe, expect, it } from 'vitest';
import {
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	encodeHeadwordForSearch
} from '../models/dictionary-headword-index.model';

interface HeadwordMatch {
	headword: string;
	key: string;
}

type EnrichedResult = {
	field: string;
	result: Array<{ id: string; doc: HeadwordMatch }>;
};

/** Probe the installed FlexSearch Document API without changing Dictionary's implementation. */
function createIndex(idField: 'key' | 'id' = 'key') {
	return new FlexSearch.Document({
		tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER,
		encode: false,
		document: {
			id: idField,
			index: 'searchableHeadword',
			store: ['headword', 'key']
		}
	});
}

function addMatch(index: ReturnType<typeof createIndex>, match: HeadwordMatch, id = match.key): void {
	index.add({
		...match,
		id,
		searchableHeadword: encodeHeadwordForSearch(match.headword)
	});
}

function searchMatches(index: ReturnType<typeof createIndex>, query: string): HeadwordMatch[] {
	// v0.7's search result typings do not narrow the enriched result shape.
	const results = index.search(encodeHeadwordForSearch(query), {
		enrich: true,
		limit: 100
	}) as unknown as EnrichedResult[];
	return results
		.flatMap(group => group.result.map(hit => hit.doc))
		.sort((a, b) => a.headword.localeCompare(b.headword) || a.key.localeCompare(b.key));
}

const sameWordDifferentKeys: HeadwordMatch[] = [
	{ headword: 'love', key: 'H157' },
	{ headword: 'love', key: 'G25' },
	{ headword: 'love', key: 'G26' }
];

describe('FlexSearch Document dictionary headword experiment', () => {
	it('returns each definition key when multiple documents share the same headword', () => {
		const index = createIndex();
		for (const match of sameWordDifferentKeys) {
			addMatch(index, match);
		}
		addMatch(index, { headword: 'beginning', key: 'H7225' });

		const expected = [...sameWordDifferentKeys].sort((a, b) => a.key.localeCompare(b.key));
		expect(searchMatches(index, 'love')).toEqual(expected);
		expect(searchMatches(index, 'lov')).toEqual(expected);
		expect(searchMatches(index, 'beginning')).toEqual([{ headword: 'beginning', key: 'H7225' }]);
	});

	it('preserves the headword and definition key after export/import', async () => {
		const index = createIndex();
		for (const match of sameWordDifferentKeys) {
			addMatch(index, match);
		}

		const chunks: Record<string, string> = {};
		await index.export((key: string, data: string | undefined) => {
			chunks[key] = data ?? '';
		});
		expect(Object.keys(chunks).length).toBeGreaterThan(0);

		const restored = createIndex();
		for (const [key, data] of Object.entries(chunks)) {
			await restored.import(key, data);
		}
		expect(searchMatches(restored, 'love')).toEqual(
			[...sameWordDifferentKeys].sort((a, b) => a.key.localeCompare(b.key))
		);
	});

	it('uses a composite document ID when different headwords resolve to the same definition key', () => {
		const index = createIndex('id');
		const matches: HeadwordMatch[] = [
			{ headword: 'love', key: 'G26' },
			{ headword: 'charity', key: 'G26' },
			{ headword: 'love', key: 'G25' }
		];
		for (const match of matches) {
			addMatch(index, match, `${match.headword}:${match.key}`);
		}

		expect(searchMatches(index, 'love')).toEqual([
			{ headword: 'love', key: 'G25' },
			{ headword: 'love', key: 'G26' }
		]);
		expect(searchMatches(index, 'charity')).toEqual([{ headword: 'charity', key: 'G26' }]);
	});

	it('also returns Webster-style entries where the headword equals its definition key', () => {
		const index = createIndex();
		addMatch(index, { headword: 'serpent', key: 'serpent' });
		expect(searchMatches(index, 'serp')).toEqual([{ headword: 'serpent', key: 'serpent' }]);
	});
});
