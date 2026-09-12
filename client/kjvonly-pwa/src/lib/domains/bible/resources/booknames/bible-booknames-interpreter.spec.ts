import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	BibleBooknamesInterpreter
} from './bible-booknames-interpreter';

describe(
	'BibleBooknamesInterpreter',
	() => {
		it(
			'interprets a Bible Booknames Resource',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				const value = {
					booknamesById: {
						'1':
							'Genesis'
					}
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
						key:
							'default',

						value
					}
				]);
			}
		);

		it(
			'preserves the key from the Resource path',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/bible/booknames/custom'
							})
						)
					];

				expect(
					candidates[0]
						.key
				).toBe(
					'custom'
				);
			}
		);

		it(
			'does not perform Bible Booknames schema validation',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								value:
									'not-booknames'
							})
						)
					];

				expect(
					candidates
				).toEqual([
					{
						key:
							'default',

						value:
							'not-booknames'
					}
				]);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceType:
										'kjvonly/bible/chapters'
								})
							)
						]
				).toThrow(
					'Invalid Bible Booknames Resource Type: kjvonly/bible/chapters'
				);
			}
		);

		it(
			'rejects a Resource Identifier with the wrong Resource Type',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/bible/chapters/default'
								})
							)
						]
				).toThrow(
					'Invalid Bible Booknames Resource Identifier: kjvonly/bible/chapters/default'
				);
			}
		);

		it(
			'rejects the Bible Booknames Resource root',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/bible/booknames'
								})
							)
						]
				).toThrow(
					'Bible Booknames Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a Resource path with too many segments',
			() => {
				const interpreter =
					new BibleBooknamesInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/bible/booknames/default/extra'
								})
							)
						]
				).toThrow(
					'Invalid Bible Booknames Resource path: kjvonly/bible/booknames/default/extra'
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
			'kjvonly/bible/booknames/default',

		resourceType:
			BIBLE_BOOKNAMES_RESOURCE_TYPE,

		modifiedAt:
			123,

		mediaType:
			'application/json',

		value:
			{},

		...overrides
	};
}
