import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_SEARCH_RESOURCE_TYPE,
	BibleSearchIndexInterpreter
} from './bible-search-index-interpreter';

describe(
	'BibleSearchIndexInterpreter',
	() => {
		it(
			'interprets a versioned Bible Search Index Resource',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				const value =
					createChunks();

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
						version:
							'kjvs',

						value
					}
				]);
			}
		);

		it(
			'preserves the version from the Resource path',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				const [candidate] = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/bible/search/kjv'
						})
					)
				];

				expect(
					candidate.version
				).toBe(
					'kjv'
				);
			}
		);

		it(
			'does not perform FlexSearch export validation',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				const [candidate] = [
					...interpreter.interpret(
						createResource({
							value:
								'not-an-index'
						})
					)
				];

				expect(
					candidate.value
				).toBe(
					'not-an-index'
				);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceType:
									'kjvonly/bible/chapters'
							})
						)
					]
				).toThrow(
					'Invalid Bible Search Index Resource Type: kjvonly/bible/chapters'
				);
			}
		);

		it(
			'rejects a Resource Identifier with the wrong Resource Type',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/bible/chapters/kjvs'
							})
						)
					]
				).toThrow(
					'Invalid Bible Search Index Resource Identifier: kjvonly/bible/chapters/kjvs'
				);
			}
		);

		it(
			'rejects the Resource Type root',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									BIBLE_SEARCH_RESOURCE_TYPE
							})
						)
					]
				).toThrow(
					'Bible Search Index Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a Resource path deeper than version',
			() => {
				const interpreter =
					new BibleSearchIndexInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/bible/search/kjvs/extra'
							})
						)
					]
				).toThrow(
					'Invalid Bible Search Index Resource path: kjvonly/bible/search/kjvs/extra'
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
			'kjvonly/bible/search/kjvs',

		resourceType:
			BIBLE_SEARCH_RESOURCE_TYPE,

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			createChunks(),

		...overrides
	};
}

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}
