import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '../../persistence/strongs-store';

import {
	createStrongsResourceId
} from '../strongs-resource-id';

import {
	STRONGS_DATA_TYPE,
	STRONGS_DATA_VERSION,
	STRONGS_RESOURCE_TYPE
} from './strongs-resource-contract';

import {
	StrongsDomainObjectFactory
} from './strongs-domain-object-factory';

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

function resource(
	resourceId: string,
	value: unknown
): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId,
		resourceType:
			STRONGS_RESOURCE_TYPE,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		dataType:
			STRONGS_DATA_TYPE,
		dataVersion:
			STRONGS_DATA_VERSION,
		value
	};
}

describe(
	'StrongsDomainObjectFactory',
	() => {
		it(
			'creates one Strong\'s Domain object from a single-definition Resource',
			() => {
				const factory =
					new StrongsDomainObjectFactory();

				expect(
					factory.create(
						resource(
							createStrongsResourceId(
								'kjvs',
								'G1'
							),
							definition
						),
						definition
					)
				).toEqual([
					{
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/G1',
						dataType:
							STRONGS_DATA_TYPE,
						dataVersion:
							1,
						value: {
							...definition,
							id:
								'publisher/kjvs/G1'
						}
					}
				]);
			}
		);

		it(
			'creates many Strong\'s Domain objects from a version bundle',
			() => {
				const factory =
					new StrongsDomainObjectFactory();

				const g2 = {
					...definition,
					number:
						'G2'
				};

				const bundle = {
					G1:
						definition,
					G2:
						g2
				};

				expect(
					factory.create(
						resource(
							createStrongsResourceId(
								'kjvs'
							),
							bundle
						),
						bundle
					)
				).toEqual([
					{
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/G1',
						dataType:
							STRONGS_DATA_TYPE,
						dataVersion:
							1,
						value: {
							...definition,
							id:
								'publisher/kjvs/G1'
						}
					},
					{
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/G2',
						dataType:
							STRONGS_DATA_TYPE,
						dataVersion:
							1,
						value: {
							...g2,
							id:
								'publisher/kjvs/G2'
						}
					}
				]);
			}
		);

		it(
			'rejects Resource ID that disagrees with the accepted definition',
			() => {
				const factory =
					new StrongsDomainObjectFactory();

				expect(
					() =>
						factory.create(
							resource(
								createStrongsResourceId(
									'kjvs',
									'G2'
								),
								definition
							),
							definition
						)
				).toThrow(
					"Strong's key G2 does not match content number G1."
				);
			}
		);
	}
);
