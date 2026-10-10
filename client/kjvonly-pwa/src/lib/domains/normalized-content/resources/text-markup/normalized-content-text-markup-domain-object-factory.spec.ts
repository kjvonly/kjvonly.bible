import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE
} from '../../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId
} from './normalized-content-text-markup-resource';

import {
	NormalizedContentTextMarkupDomainObjectFactory
} from './normalized-content-text-markup-domain-object-factory';

describe(
	'NormalizedContentTextMarkupDomainObjectFactory',
	() => {
		it(
			'creates user-owned markup for the exact target document snapshot',
			() => {
				const markings = {
					'paragraph-1': {
						'2': {
							class: [
								'bg-highlighta'
							]
						}
					}
				};

				const resource:
					DecodedResourceContent = {
						publisher:
							'markup-publisher',

						resourceId:
							createNormalizedContentTextMarkupResourceId(
								'document-publisher',
								'kjvonly/sermons/sermon-1',
								42
							),

						resourceType:
							NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,

						modifiedAt:
							100,

						mediaType:
							'application/json',

						dataType:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,

						dataVersion:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,

						value:
							markings
					};

				const factory =
					new NormalizedContentTextMarkupDomainObjectFactory();

				expect(
					factory.create(
						resource,
						markings
					)
				).toEqual([
					{
						objectType:
							NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,

						objectId:
							'markup-publisher/document-publisher/kjvonly%2Fsermons%2Fsermon-1/42',

						dataType:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,

						dataVersion:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,

						value: {
							id:
								'markup-publisher/document-publisher/kjvonly%2Fsermons%2Fsermon-1/42',
							document: {
								publisher:
									'document-publisher',
								resourceId:
									'kjvonly/sermons/sermon-1',
								modifiedAt:
									42
							},
							markings
						}
					}
				]);
			}
		);
	}
);
