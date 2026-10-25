import { describe, expect, it } from 'vitest';
import { DictionaryEntriesDataTypeHandler, WebsterDefinitionFormatValidator } from '$lib/domains/dictionary';
import { StrongsDictionaryDefinitionFormatValidator } from './strongs-dictionary-definition-format-validator';

const definition = {
	number: 'G1',
	originalWord: 'Α',
	partsOfSpeech: 'Letter',
	phoneticSpelling: "al'-fah",
	transliteratedWord: 'A',
	usageByBook: [],
	usageByWord: [],
	brownDef: null,
	strongsDef: '<div>Alpha</div>',
	thayersDef: null
};

const handler = new DictionaryEntriesDataTypeHandler([
	new WebsterDefinitionFormatValidator(),
	new StrongsDictionaryDefinitionFormatValidator()
]);

function strongsEdition(value: unknown = definition, key = 'G1') {
	return {
		definitionFormat: 'strongs',
		headwords: [{ headword: 'alpha', key }],
		definitions: { [key]: value }
	};
}

describe('Strong\'s Dictionary definition format', () => {
	it('accepts the existing structured Strong\'s data through the generic Dictionary bundle', () => {
		const bundle = strongsEdition();
		expect(handler.validate(bundle)).toBe(bundle);
	});

	it('rejects incomplete definitions, mismatched numbers and invalid Strong\'s keys', () => {
		expect(() => handler.validate(strongsEdition({ number: 'G1' }))).toThrow();
		expect(() => handler.validate(strongsEdition({ ...definition, number: 'G2' })))
			.toThrow('does not match content number');
		expect(() => handler.validate(strongsEdition({ ...definition, number: 'g1' }, 'g1')))
			.toThrow('Invalid Strong\'s key');
	});

	it('does not interpret Webster HTML as a Strong\'s definition', () => {
		expect(() => handler.validate(strongsEdition([{ word: 'G1', content: '<p>Alpha</p>' }]))).toThrow();
	});

	it('keeps Webster validation available through the same entrypoint', () => {
		const bundle = {
			definitionFormat: 'webster-html',
			headwords: [{ headword: 'love', key: 'love' }],
			definitions: { love: [{ word: 'LOVE', content: '<p>Affection.</p>' }] }
		};
		expect(handler.validate(bundle)).toBe(bundle);
	});
});
