import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	createNormalizedDocumentId,
	createNormalizedDocumentIdForDescriptor
} from './normalized-document-id';

describe(
	'normalized document identity',
	() => {
		it(
			'does not require Resource id to encode a Resource Type',
			() => {
				expect(
					createNormalizedDocumentId(
						'publisher',
						'library/doc-1'
					)
				).toBe(
					'publisher/library/doc-1'
				);
			}
		);

		it(
			'does not require descriptor Resource Type to match Resource id',
			() => {
				const descriptor: ResourceDescriptor = {
					metadata: {
						publisher:
							'publisher',

						resourceId:
							'library/doc-1',

						resourceType:
							'sermons',

						dataType:
							'kjvonly.normalized-document',

						dataVersion:
							1,

						modifiedAt:
							1,

						representation:
							'content',

						mediaType:
							'application/json'
					},

					strategy: {
						type:
							'test',

						data:
							null
					}
				};

				expect(
					createNormalizedDocumentIdForDescriptor(
						descriptor
					)
				).toBe(
					'publisher/library/doc-1'
				);
			}
		);

		it(
			'rejects an empty Resource id',
			() => {
				expect(
					() =>
						createNormalizedDocumentId(
							'publisher',
							''
						)
				).toThrow(
					'Invalid normalized document Resource ID.'
				);
			}
		);
	}
);
