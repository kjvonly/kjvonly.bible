import { describe, expect, it } from 'vitest';
import { DictionaryEntriesDataTypeHandler } from './dictionary-entries-data-type-handler';
import { WebsterDefinitionFormatValidator } from './webster-definition-format-validator';
import { DICTIONARY_ENTRIES_DATA_TYPE, DICTIONARY_DATA_VERSION } from './dictionary-resource-contract';

const handler = new DictionaryEntriesDataTypeHandler([new WebsterDefinitionFormatValidator()]);
const definition = (word: string) => [{ word, content: `<p>${word} definition</p>` }];
function edition(definitions: Record<string, unknown>, headwords = Object.keys(definitions).map(key => ({ headword: key, key }))) {
	return { definitionFormat: 'webster-html', headwords, definitions };
}

const bundle = edition({
	a: [
		{ word: 'A', content: '<div><p>A letter.</p></div>' },
		{ word: 'a', content: '<p>A second sense.</p>' }
	],
	aam: [{ word: 'AAM', content: '<p>A measure.</p>' }]
});

describe('DictionaryEntriesDataTypeHandler', () => {
	it('accepts the common edition envelope and preserves ordered Webster HTML definitions', () => {
		expect(handler.dataType).toBe(DICTIONARY_ENTRIES_DATA_TYPE);
		expect(handler.dataVersion).toBe(DICTIONARY_DATA_VERSION);
		expect(handler.validate(bundle)).toEqual(bundle);
		expect((handler.validate(bundle).definitions.a as unknown[])).toHaveLength(2);
	});

	it('accepts many-to-many associations and preserves opaque definition identities', () => {
		const source = edition({ love: definition('LOVE'), charity: definition('CHARITY') }, [
			{ headword: 'love', key: 'love' },
			{ headword: 'charity', key: 'love' },
			{ headword: 'love', key: 'charity' }
		]);
		expect(handler.validate(source).headwords).toHaveLength(3);
	});

	it.each([
		{}, [], edition({}), edition({ a: definition('A') }, []),
		{ ...bundle, definitionFormat: 'unknown' },
		edition({ a: [] }),
		edition({ a: [{ word: 'A', content: '' }] }),
		edition({ a: [{ word: 'B', content: '<p>b</p>' }] }),
		edition({ a: [{ word: 'A', content: '<p>a</p>', id: 1 }] }),
		edition({ a: definition('A') }, [{ headword: 'A', key: 'a' }]),
		edition({ a: definition('A') }, [{ headword: 'a', key: 'missing' }]),
		edition({ a: definition('A') }, [{ headword: 'a', key: 'a' }, { headword: 'a', key: 'a' }]),
		edition({ a: definition('A') }, [{ headword: '', key: 'a' }]),
		edition({ a: definition('A') }, [{ headword: 'a', key: '' }])
	])('rejects malformed editions and associations %#', invalid => {
		expect(() => handler.validate(invalid)).toThrow();
	});

	it('safely accepts a prototype-looking definition key from JSON', () => {
		const keyed = JSON.parse('{"__proto__":[{"word":"__proto__","content":"<p>x</p>"}]}');
		const source = edition(keyed);
		expect(Object.hasOwn(handler.validate(source).definitions, '__proto__')).toBe(true);
	});
});
