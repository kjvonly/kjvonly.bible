import { describe, expect, it } from 'vitest';
import { DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE } from '../models/dictionary-published-headword-index.model';
import { IndexedDBDictionaryPublishedIndexStore } from './indexeddb-dictionary-published-index-store';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const value = {
	resourceId: source.resourceId, sourceSha256: 'a'.repeat(64), formatVersion: 1,
	tokenizer: 'forward', encoding: 'codepoint-base36-padded4',
	headwordCount: 2, chunks: { reg: '{}' }
};

/** Mimic the Domain object read boundary without requiring browser IDB. */
function fixture(payload: unknown = value) {
	const db = { get: async (_store: unknown, key: string) => ({
		id: key,
		objectType: DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
		dataType: 'kjvonly.dictionary.headword-index', dataVersion: 1,
		value: payload
	}) };
	return new IndexedDBDictionaryPublishedIndexStore(async () => db as never);
}

describe('published Dictionary index lookup', () => {
	it('loads the publisher- and entries-scoped portable export', async () => {
		await expect(fixture().get(source)).resolves.toEqual(value);
	});
	it('ignores invalid published index metadata', async () => {
		await expect(fixture({ ...value, tokenizer: 'full' }).get(source)).resolves.toBeUndefined();
	});
	it('ignores a published index belonging to a different entries Resource', async () => {
		await expect(fixture({ ...value, resourceId: 'kjvonly/dictionary/entries/webster-1844' })
			.get(source)).resolves.toBeUndefined();
	});
});
