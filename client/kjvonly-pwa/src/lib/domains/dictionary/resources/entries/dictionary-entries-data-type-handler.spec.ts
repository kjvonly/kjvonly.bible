import { describe, expect, it } from 'vitest';
import { DictionaryEntriesDataTypeHandler } from './dictionary-entries-data-type-handler';
import {
	DICTIONARY_ENTRIES_DATA_TYPE,
	DICTIONARY_DATA_VERSION
} from './dictionary-resource-contract';

const handler = new DictionaryEntriesDataTypeHandler();

const bundle = {
	a: [
		{ word: 'A', content: '<div><p><b>A</b> letter.</p></div>' },
		{ word: 'a', content: '<p>A second sense.</p>' }
	],
	aam: [{ word: 'AAM', content: '<p><i>noun</i> A measure.</p>' }]
};

describe('DictionaryEntriesDataTypeHandler', () => {
	it('declares the published semantic contract and preserves ordered HTML definitions', () => {
		expect(handler.dataType).toBe(DICTIONARY_ENTRIES_DATA_TYPE);
		expect(handler.dataVersion).toBe(DICTIONARY_DATA_VERSION);
		expect(handler.validate(bundle)).toEqual(bundle);
		expect(handler.validate(bundle).a).toHaveLength(2);
	});

	it('accepts normalized lookup keys while preserving display spelling', () => {
		const bundle = { 'a b': [{ word: '  A   B  ', content: '<p>Definition.</p>' }] };
		expect(handler.validate(bundle)).toEqual(bundle);
	});

	it.each([
		{},
		[],
		{ a: [] },
		{ A: [{ word: 'A', content: '<p>a</p>' }] },
		{ ' a ': [{ word: 'A', content: '<p>a</p>' }] },
		{ a: [{ word: 'A', content: '' }] },
		{ a: [{ word: '', content: '<p>a</p>' }] },
		{ a: [{ word: 'A', content: 12 }] },
		{ a: [{ word: 'B', content: '<p>b</p>' }] },
		{ a: [{ word: 'A', content: '<p>a</p>' }, { word: 'B', content: '<p>b</p>' }] },
		{ a: [{ word: 'A', content: '<p>a</p>', id: 1 }] },
		{ a: { word: 'A', content: '<p>a</p>' } },
		{ a: null }
	])('rejects invalid bundle shape %#', invalid => {
		expect(() => handler.validate(invalid)).toThrow();
	});

	it('does not treat JSON object keys as prototype assignments', () => {
		const value = JSON.parse('{"__proto__":[{"word":"__proto__","content":"<p>x</p>"}]}');
		expect(Object.hasOwn(handler.validate(value), '__proto__')).toBe(true);
	});
});
