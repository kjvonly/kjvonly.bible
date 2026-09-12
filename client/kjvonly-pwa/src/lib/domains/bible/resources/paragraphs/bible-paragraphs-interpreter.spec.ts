import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BibleParagraphsInterpreter
} from './bible-paragraphs-interpreter';

describe(
	'BibleParagraphsInterpreter',
	() => {
		it(
			'interprets a Bible Paragraphs bundle into Chapter candidates',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				const value = {
					'1_1': {
						'1_1_1_0': {}
					},

					'1_2':
						null
				};

				const candidates =
					[
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
						source:
							'default',

						chapterRef:
							'1_1',

						value:
							value['1_1']
					},
					{
						source:
							'default',

						chapterRef:
							'1_2',

						value:
							null
					}
				]);
			}
		);

		it(
			'interprets an individual Bible Paragraphs Chapter Resource',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				const value = {
					'10_1_1_0': {},
					'10_1_5_0': {}
				};

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/paragraphs/default/10_1',

							value
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						source:
							'default',

						chapterRef:
							'10_1',

						value
					}
				]);
			}
		);

		it(
			'accepts null content for an individual Paragraphs Chapter candidate',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/paragraphs/default/1_2',

							value:
								null
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						source:
							'default',

						chapterRef:
							'1_2',

						value:
							null
					}
				]);
			}
		);

		it(
			'preserves the source from the Resource path',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/paragraphs/custom/1_1',

								value: {}
							})
						)
					];

				expect(
					candidates[0].source
				).toBe(
					'custom'
				);
			}
		);

		it(
			'does not perform Paragraph marker schema validation',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/paragraphs/default/1_1',

								value:
									'not-paragraphs'
							})
						)
					];

				expect(
					candidates
				).toEqual([
					{
						source:
							'default',

						chapterRef:
							'1_1',

						value:
							'not-paragraphs'
					}
				]);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceType:
										'kjvonly/overlays/pericopes'
								})
							)
						]
				).toThrow(
					'Invalid Bible Paragraphs Resource Type: kjvonly/overlays/pericopes'
				);
			}
		);

		it(
			'rejects a Resource Identifier with the wrong Resource Type',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/overlays/pericopes/default'
								})
							)
						]
				).toThrow(
					'Invalid Bible Paragraphs Resource Identifier: kjvonly/overlays/pericopes/default'
				);
			}
		);

		it(
			'rejects the Bible Paragraphs Resource root',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/overlays/paragraphs'
								})
							)
						]
				).toThrow(
					'Bible Paragraphs Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a Resource path with more than source and Chapter',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/overlays/paragraphs/default/1_1/extra'
								})
							)
						]
				).toThrow(
					'Invalid Bible Paragraphs Resource path: kjvonly/overlays/paragraphs/default/1_1/extra'
				);
			}
		);

		it(
			'rejects a malformed individual Chapter reference',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/paragraphs/default/01_1',

								value: {}
							})
						)
					]
				).toThrow(
					'Invalid Bible Paragraphs chapter reference: 01_1'
				);
			}
		);

		it(
			'rejects non-object bundle content',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									value:
										'not-a-bundle'
								})
							)
						]
				).toThrow(
					'Bible Paragraphs bundle content must be an object.'
				);
			}
		);

		it(
			'rejects a malformed Chapter bundle key',
			() => {
				const interpreter =
					new BibleParagraphsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									value: {
										'01_1': {}
									}
								})
							)
						]
				).toThrow(
					'Invalid Bible Paragraphs chapter reference: 01_1'
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

		resourceId:
			'kjvonly/overlays/paragraphs/default',

		resourceType:
			BIBLE_PARAGRAPHS_RESOURCE_TYPE,

		modifiedAt:
			123,

		mediaType:
			'application/json',

		value: {
			'1_1': {}
		},

		...overrides
	};
}
