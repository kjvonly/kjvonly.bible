import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	type PublishedResourceReference,
	type ResourceRepresentation,
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	createBrowserResourceWorkerClient
} from '$lib/resource/worker';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_OBJECT_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION,
	createNormalizedDocumentId,
	type NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const RESOURCE_ID =
	'library/sermons/browser-test';

describe(
	'Normalized Content generic Resource installation',
	() => {
		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					DOMAIN_OBJECTS
				);

				await db.clear(
					RESOURCE_INSTALLATIONS
				);

				await db.clear(
					RESOURCE_RECEIPTS
				);
			}
		);

		it(
			'installs a validated NormalizedDocument through the generic Resource lifecycle',
			async () => {
				const publisher =
					createPublisher();

				const reference:
					PublishedResourceReference = {
						publisher,
						resourceId:
							RESOURCE_ID
					};

				const document:
					NormalizedDocument = {
					source:
						'browser-test',

					blocks: [
						{
							type:
								'paragraph',

							content: [
								{
									type:
										'word',

									text:
										'Generic resource lifecycle'
								}
							]
						}
					]
				};

				const discovery =
					new FakeDiscovery({
						publisher,
						resourceId:
							RESOURCE_ID,

						resourceType:
							NORMALIZED_CONTENT_RESOURCE_TYPE,

						dataType:
							NORMALIZED_DOCUMENT_DATA_TYPE,

						dataVersion:
							NORMALIZED_DOCUMENT_DATA_VERSION,

						eventId:
							'a'.repeat(
								64
							),

						modifiedAt:
							100,

						representation:
							'content',

						mediaType:
							'application/json',

						payload:
							JSON.stringify(
								document
							)
					});

				const client =
					createBrowserResourceWorkerClient(
						discovery
					);

				try {
					const result =
						await client.install(
							reference
						);

					expect(
						result
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference,

								resourceType:
									NORMALIZED_CONTENT_RESOURCE_TYPE,

								status:
									'handled'
							}
						]
					});

					expect(
						discovery.references
					).toEqual([
						reference
					]);

					const objectId =
						createNormalizedDocumentId(
							publisher,
							RESOURCE_ID
						);

					const db =
						await getApplicationDB();

					expect(
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								NORMALIZED_DOCUMENT_OBJECT_TYPE,
								objectId
							)
						)
					).toEqual({
						id:
							createStoredDomainObjectId(
								NORMALIZED_DOCUMENT_OBJECT_TYPE,
								objectId
							),

						objectType:
							NORMALIZED_DOCUMENT_OBJECT_TYPE,

						objectId,

						dataType:
							NORMALIZED_DOCUMENT_DATA_TYPE,

						dataVersion:
							NORMALIZED_DOCUMENT_DATA_VERSION,

						value:
							document
					});

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								NORMALIZED_DOCUMENT_OBJECT_TYPE,
								objectId
							)
						)
					).toMatchObject({
						objectType:
							NORMALIZED_DOCUMENT_OBJECT_TYPE,

						objectId,
						publisher,
						resourceId:
							RESOURCE_ID,

						modifiedAt:
							100
					});

					expect(
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								publisher,
								RESOURCE_ID
							)
						)
					).toEqual({
						id:
							createResourceReceiptId(
								publisher,
								RESOURCE_ID
							),

						publisher,
						resourceId:
							RESOURCE_ID,

						modifiedAt:
							100
					});
				} finally {
					client.dispose();
				}
			}
		);

		it(
			'does not install or receipt a Resource with an unsupported data type',
			async () => {
				const publisher =
					createPublisher();

				const reference:
					PublishedResourceReference = {
						publisher,
						resourceId:
							RESOURCE_ID
					};

				const discovery =
					new FakeDiscovery({
						publisher,
						resourceId:
							RESOURCE_ID,

						resourceType:
							NORMALIZED_CONTENT_RESOURCE_TYPE,

						dataType:
							'kjvonly.unsupported',

						dataVersion:
							1,

						eventId:
							'b'.repeat(
								64
							),

						modifiedAt:
							100,

						representation:
							'content',

						mediaType:
							'application/json',

						payload:
							JSON.stringify({
								blocks: []
							})
					});

				const client =
					createBrowserResourceWorkerClient(
						discovery
					);

				try {
					const result =
						await client.install(
							reference
						);

					expect(
						result.resources
					).toHaveLength(
						1
					);

					expect(
						result.resources[0]
					).toMatchObject({
						reference,
						resourceType:
							NORMALIZED_CONTENT_RESOURCE_TYPE,
						status:
							'failed',

						error: {
							message:
								'Unsupported Resource data type: kjvonly.unsupported@1'
						}
					});

					const objectId =
						createNormalizedDocumentId(
							publisher,
							RESOURCE_ID
						);

					const db =
						await getApplicationDB();

					expect(
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								NORMALIZED_DOCUMENT_OBJECT_TYPE,
								objectId
							)
						)
					).toBeUndefined();

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								NORMALIZED_DOCUMENT_OBJECT_TYPE,
								objectId
							)
						)
					).toBeUndefined();

					expect(
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								publisher,
								RESOURCE_ID
							)
						)
					).toBeUndefined();
				} finally {
					client.dispose();
				}
			}
		);
	}
);

function createPublisher():
	string {

	const value =
		crypto
			.randomUUID()
			.replaceAll(
				'-',
				''
			);

	return (
		value +
		value
	);
}

class FakeDiscovery {
	readonly references:
		PublishedResourceReference[] =
		[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		this.references.push(
			reference
		);

		return this.representation;
	}
}
