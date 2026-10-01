import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	DecodedResourceContent,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import {
	ResourceResolutionProcessor
} from './resource-resolution-processor';


describe(
	'ResourceResolutionProcessor',
	() => {
		it(
			'processes an existing Resource resolution result without resolving a representation',
			async () => {
				const content:
					VerifiedResourceContent = {
					publisher:
						'publisher',

					resourceId:
						'kjvonly/strongs/definitions/kjvs',

					resourceType:
						'kjvonly/strongs/definitions',

					modifiedAt:
						100,

					mediaType:
						'application/json',

					content:
						'{}'
				};

				const decoded:
					DecodedResourceContent = {
					publisher:
						content.publisher,

					resourceId:
						content.resourceId,

					resourceType:
						content.resourceType,

					modifiedAt:
						content.modifiedAt,

					mediaType:
						content.mediaType,

					value:
						{}
				};

				const decoder = {
					decode:
						vi.fn(
							async () =>
								decoded
						)
				};

				const handler = {
					resourceType:
						content.resourceType,

					handle:
						vi.fn(
							async () =>
								undefined
						)
				};

				const receipts = {
					markProcessed:
						vi.fn(
							async () =>
								undefined
						)
				};

				const processor =
					new ResourceResolutionProcessor(
						decoder,
						receipts,
						[
							handler
						]
					);

				const requested = {
					publisher:
						'publisher',

					resourceId:
						'kjvonly/resources/collection/default'
				};

				const failure =
					new Error(
						'Resource resolution failed'
					);

				const result =
					await processor.process(
						requested,
						{
							contents: [
								content
							],

							current: [
								{
									publisher:
										'publisher',

									resourceId:
										'kjvonly/bible/chapters/kjvs',

									resourceType:
										'kjvonly/bible/chapters'
								}
							],

							failures: [
								{
									error:
										failure
								}
							]
						}
					);

				expect(
					result
				).toEqual({
					requested,
					found:
						true,

					resources: [
						{
							status:
								'failed',

							error:
								failure
						},
						{
							reference: {
								publisher:
									'publisher',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							},

							resourceType:
								'kjvonly/bible/chapters',

							status:
								'current'
						},
						{
							reference: {
								publisher:
									content.publisher,

								resourceId:
									content.resourceId
							},

							resourceType:
								content.resourceType,

							status:
								'handled'
						}
					]
				});

				expect(
					decoder.decode
				).toHaveBeenCalledWith(
					content
				);

				expect(
					handler.handle
				).toHaveBeenCalledWith(
					decoded
				);

				expect(
					receipts.markProcessed
				).toHaveBeenCalledWith(
					content.publisher,
					content.resourceId,
					content.modifiedAt
				);
			}
		);
	}
);
