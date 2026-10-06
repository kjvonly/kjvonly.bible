import {
	describe,
	expect,
	it
} from 'vitest';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '../../persistence/strongs-store';

import {
	STRONGS_DATA_TYPE,
	STRONGS_DATA_VERSION
} from './strongs-resource-contract';

import {
	StrongsDataTypeHandler,
	StrongsDefinitionDataTypeHandler
} from './strongs-data-type-handler';

const definition = {
	number:
		'G1',
	originalWord:
		'word',
	partsOfSpeech:
		'noun',
	phoneticSpelling:
		'phonetic',
	transliteratedWord:
		'transliterated',
	usageByBook:
		[],
	usageByWord:
		[],
	brownDef:
		null,
	strongsDef:
		'definition',
	thayersDef:
		null
};

describe(
	'StrongsDataTypeHandler',
	() => {
		it(
			'declares the existing Strong\'s semantic contract',
			() => {
				const handler =
					new StrongsDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					STRONGS_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					STRONGS_DATA_VERSION
				);
			}
		);

		it(
			'accepts one existing Strong\'s definition payload',
			() => {
				const handler =
					new StrongsDataTypeHandler();

				expect(
					handler.validate(
						definition
					)
				).toEqual(
					definition
				);
			}
		);

		it(
			'accepts an existing Strong\'s bundle payload',
			() => {
				const handler =
					new StrongsDataTypeHandler();

				const bundle = {
					G1:
						definition
				};

				expect(
					handler.validate(
						bundle
					)
				).toEqual(
					bundle
				);
			}
		);

		it(
			'rejects invalid semantic payloads',
			() => {
				const handler =
					new StrongsDataTypeHandler();

				expect(
					() =>
						handler.validate({
							G1: {
								number:
									'G1'
							}
						})
				).toThrow();
			}
		);
	}
);


describe(
	'StrongsDefinitionDataTypeHandler',
	() => {
		it(
			"validates the persisted individual Strong's definition contract",
			() => {
				const handler =
					new StrongsDefinitionDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					STRONGS_DEFINITION_OBJECT_TYPE
				);

				expect(
					handler.validate(
						definition
					)
				).toEqual(
					definition
				);
			}
		);

		it(
			"rejects a bundle for the individual Strong's definition contract",
			() => {
				const handler =
					new StrongsDefinitionDataTypeHandler();

				expect(
					() =>
						handler.validate({
							G1:
								definition
						})
				).toThrow();
			}
		);
	}
);
