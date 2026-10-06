import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from './normalized-content-resource-contract';

import {
	NORMALIZED_DOCUMENT_OBJECT_TYPE
} from '../models/normalized-document-id';

import {
	NormalizedContentDomainObjectFactory
} from './normalized-content-domain-object-factory';

describe(
	'NormalizedContentDomainObjectFactory',
	() => {
		it(
			'creates the standalone normalized-document Domain identity from Resource ID',
			() => {
				const value = {
					blocks: []
				};

				const resource:
					DecodedResourceContent = {
						publisher:
							'publisher',

						resourceId:
							'documents/example',

						resourceType:
							NORMALIZED_CONTENT_RESOURCE_TYPE,

						modifiedAt:
							100,

						mediaType:
							'application/json',

						dataType:
							NORMALIZED_DOCUMENT_DATA_TYPE,

						dataVersion:
							NORMALIZED_DOCUMENT_DATA_VERSION,

						value
					};

				const factory =
					new NormalizedContentDomainObjectFactory();

				expect(
					factory.create(
						resource,
						value
					)
				).toEqual([
					{
						objectType:
							NORMALIZED_DOCUMENT_OBJECT_TYPE,


						objectId:
							'publisher/documents/example',

						dataType:
							NORMALIZED_DOCUMENT_DATA_TYPE,

						dataVersion:
							NORMALIZED_DOCUMENT_DATA_VERSION,

						value
					}
				]);
			}
		);
	}
);
