import { describe, expect, it } from 'vitest';
import { createDictionaryPublishedIndexResourceId } from '../../models/dictionary-published-headword-index.model';
import { DictionaryPublishedHeadwordIndexDataTypeHandler } from './dictionary-published-headword-index-data-type-handler';
import { DictionaryPublishedHeadwordIndexFactory } from './dictionary-published-headword-index-factory';

const resourceId = 'kjvonly/dictionary/entries/webster-1828';
const payload = {
	resourceId, sourceSha256: 'a'.repeat(64),
	formatVersion: 1, tokenizer: 'forward', encoding: 'codepoint-base36-padded4',
	headwordCount: 2, chunks: { reg: '{}' }
};
const resource = {
	publisher: 'publisher', resourceId: createDictionaryPublishedIndexResourceId(resourceId),
	resourceType: 'dictionary/search-index', dataType: 'kjvonly.dictionary.headword-index',
	dataVersion: 1, mediaType: 'application/json', modifiedAt: 100
};

describe('published Dictionary index Resource', () => {
	it('maps one published index to a publisher-scoped, entries-Resource-scoped Domain object', () => {
		const validated = new DictionaryPublishedHeadwordIndexDataTypeHandler().validate(payload);
		const [candidate] = new DictionaryPublishedHeadwordIndexFactory().create(resource, validated);
		expect(candidate).toMatchObject({
			objectType: 'dictionary/published-headword-index',
			dataType: 'kjvonly.dictionary.headword-index',
			value: payload
		});
		expect(candidate?.objectId).toContain('publisher');
	});

	it('rejects a published index belonging to another dictionary', () => {
		expect(() => new DictionaryPublishedHeadwordIndexFactory().create(resource, {
			...payload, resourceId: 'kjvonly/dictionary/entries/webster-1844'
		})).toThrow('different Resource');
	});

	it('rejects malformed hashes, encodings, and export values', () => {
		const handler = new DictionaryPublishedHeadwordIndexDataTypeHandler();
		for (const bad of [
			{ ...payload, sourceSha256: 'not-a-hash' },
			{ ...payload, encoding: 'unknown' },
			{ ...payload, chunks: { reg: 123 } }
		]) expect(() => handler.validate(bad)).toThrow();
	});
});
