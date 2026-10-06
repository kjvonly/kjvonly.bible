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
						'strongs/definition',

					modifiedAt:
						100,

					mediaType:
						'application/json',

					dataType:
						'kjvonly.strongs-definition',

					dataVersion:
						1,

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

					dataType:
						content.dataType,

					dataVersion:
						content.dataVersion,

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

				const genericInstaller = {
					install:
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
						genericInstaller,
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
										'bible/chapter'
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
								'bible/chapter',

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

		it(
			'falls back to generic semantic installation when no legacy Resource handler owns the Resource Type',
			async () => {
				const decoded:
					DecodedResourceContent = {
						publisher:
							'publisher',

						resourceId:
							'documents/example',

						resourceType:
							'sermons',

						modifiedAt:
							100,

						mediaType:
							'application/json',

						dataType:
							'kjvonly.normalized-document',

						dataVersion:
							1,

						value: {}
					};

				const genericInstaller = {
					install:
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
						{
							decode:
								vi.fn(
									async () =>
										decoded
								)
						},
						receipts,
						genericInstaller,
						[]
					);

				const outcome =
					await processor.processDecoded(
						decoded
					);

				expect(
					genericInstaller.install
				).toHaveBeenCalledWith(
					decoded
				);

				expect(outcome.status).toBe(
					'handled'
				);

				expect(
					receipts.markProcessed
				).toHaveBeenCalledWith(
					decoded.publisher,
					decoded.resourceId,
					decoded.modifiedAt
				);
			}
		);
	}
);
