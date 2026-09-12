import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BiblePericopesInterpreter
} from './bible-pericopes-interpreter';

describe(
	'BiblePericopesInterpreter',
	() => {
		it(
			'interprets a Bible Pericopes bundle into Chapter candidates',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				const value = {
					'1_1': {
						'1_1_1': [
							createPericope(
								'1_1_1',
								'The Creation'
							)
						]
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
							value['1_2']
					}
				]);
			}
		);

		it(
			'interprets an individual Bible Pericopes Chapter Resource',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				const value = {
					'10_1_1': [
						createPericope(
							'10_1_1',
							'The Proverbs of Solomon'
						)
					]
				};

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/pericopes/default/10_1',

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
			'preserves the source from the Resource path',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/pericopes/custom/1_1',

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
			'does not perform Pericope schema validation',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/overlays/pericopes/default/1_1',

							value:
								'not-pericopes'
						})
					)
				];

				expect(
					candidates[0].value
				).toBe(
					'not-pericopes'
				);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceType:
									'kjvonly/overlays/paragraphs'
							})
						)
					]
				).toThrow(
					'Invalid Bible Pericopes Resource Type: kjvonly/overlays/paragraphs'
				);
			}
		);

		it(
			'rejects a Resource Identifier with the wrong Resource Type',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/paragraphs/default'
							})
						)
					]
				).toThrow(
					'Invalid Bible Pericopes Resource Identifier: kjvonly/overlays/paragraphs/default'
				);
			}
		);

		it(
			'rejects the Bible Pericopes Resource root',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/pericopes'
							})
						)
					]
				).toThrow(
					'Bible Pericopes Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a Resource path with more than source and Chapter',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/pericopes/default/1_1/extra'
							})
						)
					]
				).toThrow(
					'Invalid Bible Pericopes Resource path: kjvonly/overlays/pericopes/default/1_1/extra'
				);
			}
		);

		it(
			'rejects a malformed individual Chapter reference',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/overlays/pericopes/default/01_1',

								value: {}
							})
						)
					]
				).toThrow(
					'Invalid Bible Pericopes chapter reference: 01_1'
				);
			}
		);

		it(
			'rejects non-object bundle content',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								value:
									'not-a-bundle'
							})
						)
					]
				).toThrow(
					'Bible Pericopes bundle content must be an object.'
				);
			}
		);

		it(
			'rejects a malformed Chapter bundle key',
			() => {
				const interpreter =
					new BiblePericopesInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								value: {
									'01_1': {}
								}
							})
						)
					]
				).toThrow(
					'Invalid Bible Pericopes chapter reference: 01_1'
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
			'kjvonly/overlays/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

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

function createPericope(
	ref: string,
	text: string
) {
	return {
		text,
		ref,
		words: [
			{
				text,
				class:
					'sc',
				href:
					null,
				emphasis:
					false
			}
		]
	};
}
