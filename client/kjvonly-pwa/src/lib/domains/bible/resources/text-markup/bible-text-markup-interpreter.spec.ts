import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	BibleTextMarkupInterpreter
} from './bible-text-markup-interpreter';

describe(
	'BibleTextMarkupInterpreter',
	() => {
		it(
			'interprets a Text Markup bundle into Chapter candidates',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				const value = {
					'1_1': {
						'1': {
							'0': {
								class: [
									'bg-highlighta'
								]
							}
						}
					},
					'1_2': {}
				};

				const candidates = [
					...interpreter.interpret(
						createResource({
							value
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						name:
							'kjvs',

						chapterRef:
							'1_1',

						value:
							value['1_1']
					},
					{
						name:
							'kjvs',

						chapterRef:
							'1_2',

						value:
							value['1_2']
					}
				]);
			}
		);

		it(
			'interprets an individual Text Markup Chapter Resource',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				const value = {
					'2': {
						'1': {
							class: [
								'bg-highlighta'
							]
						}
					}
				};

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/text-markup/kjvs/1_3',

							value
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						name:
							'kjvs',

						chapterRef:
							'1_3',

						value
					}
				]);
			}
		);

		it(
			'preserves the name from the Resource path',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/text-markup/study/1_1'
						})
					)
				];

				expect(
					candidates[0].name
				).toBe(
					'study'
				);
			}
		);

		it(
			'rejects a malformed Chapter reference',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/text-markup/kjvs/01_3'
							})
						)
					]
				).toThrow(
					'Invalid Bible Text Markup chapter reference: 01_3'
				);
			}
		);

		it(
			'rejects the Resource root',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									BIBLE_TEXT_MARKUP_RESOURCE_TYPE
							})
						)
					]
				).toThrow(
					'Bible Text Markup Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a bundle whose content is not an object',
			() => {
				const interpreter =
					new BibleTextMarkupInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								value:
									'not-text-markup'
							})
						)
					]
				).toThrow(
					'Bible Text Markup bundle content must be an object.'
				);
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceType:
			BIBLE_TEXT_MARKUP_RESOURCE_TYPE,

		resourceId:
			'kjvonly/overlays/text-markup/kjvs',

		modifiedAt:
			100,

		mediaType:
			'application/json',

		value: {},

		...overrides
	};
}
