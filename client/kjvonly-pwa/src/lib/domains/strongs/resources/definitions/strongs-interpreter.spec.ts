import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	STRONGS_RESOURCE_TYPE,
	StrongsInterpreter
} from './strongs-interpreter';

describe(
	'StrongsInterpreter',
	() => {
		it(
			'interprets an individual Strong\'s Resource',
			() => {
				const interpreter =
					new StrongsInterpreter();

				const value = {
					number:
						'G1'
				};

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/strongs/definitions/kjvs/G1',

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

						key:
							'G1',

						value
					}
				]);
			}
		);

		it(
			'interprets a Strong\'s bundle Resource',
			() => {
				const interpreter =
					new StrongsInterpreter();

				const g1 = {
					number:
						'G1'
				};

				const h1 = {
					number:
						'H1'
				};

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/strongs/definitions/kjvs',

								value: {
									G1:
										g1,

									H1:
										h1
								}
							})
						)
					];

				expect(
					candidates
				).toEqual([
					{
						version:
							'kjvs',

						key:
							'G1',

						value:
							g1
					},
					{
						version:
							'kjvs',

						key:
							'H1',

						value:
							h1
					}
				]);
			}
		);

		it(
			'preserves the version from the Resource path',
			() => {
				const interpreter =
					new StrongsInterpreter();

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/strongs/definitions/kjv/G1'
							})
						)
					];

				expect(
					candidates[0]
						.version
				).toBe(
					'kjv'
				);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new StrongsInterpreter();

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
					'Invalid Strong\'s Resource Type'
				);
			}
		);

		it(
			'rejects a Resource Identifier with the wrong Resource Type',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs/G1'
								})
							)
						]
				).toThrow(
					'Invalid Strong\'s Resource Identifier'
				);
			}
		);

		it(
			'rejects the Strong\'s Resource root',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions'
								})
							)
						]
				).toThrow(
					'Strong\'s Resource root is not supported'
				);
			}
		);

		it(
			'rejects a Resource path with too many segments',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions/kjvs/G1/extra'
								})
							)
						]
				).toThrow(
					'Invalid Strong\'s Resource path'
				);
			}
		);

		it(
			'rejects a bundle that is not an object',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions/kjvs',

									value:
										'not-an-object'
								})
							)
						]
				).toThrow(
					'Strong\'s Resource bundle must be an object'
				);
			}
		);

		it(
			'rejects a null bundle',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions/kjvs',

									value:
										null
								})
							)
						]
				).toThrow(
					'Strong\'s Resource bundle must be an object'
				);
			}
		);

		it(
			'rejects an array bundle',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions/kjvs',

									value:
										[]
								})
							)
						]
				).toThrow(
					'Strong\'s Resource bundle must be an object'
				);
			}
		);

		it(
			'rejects a bundle key containing a path separator',
			() => {
				const interpreter =
					new StrongsInterpreter();

				expect(
					() =>
						[
							...interpreter.interpret(
								createResource({
									resourceId:
										'kjvonly/strongs/definitions/kjvs',

									value: {
										'kjvs/G1': {
											number:
												'G1'
										}
									}
								})
							)
						]
				).toThrow(
					'Invalid Strong\'s Resource bundle key'
				);
			}
		);

		it(
			'does not validate the Strong\'s schema',
			() => {
				const interpreter =
					new StrongsInterpreter();

				const value = {
					anything:
						'goes'
				};

				const candidates =
					[
						...interpreter.interpret(
							createResource({
								resourceId:
									'kjvonly/strongs/definitions/kjvs/G1',

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

						key:
							'G1',

						value
					}
				]);
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
			'kjvonly/strongs/definitions/kjvs/G1',

		resourceType:
			STRONGS_RESOURCE_TYPE,

		eventId:
			'event-id',

		modifiedAt:
			123,

		mediaType:
			'application/json',

		value: {
			number:
				'G1'
		},

		...overrides
	};
}