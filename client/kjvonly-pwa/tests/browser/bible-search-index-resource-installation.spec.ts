import {
	describe,
	expect,
	it
} from 'vitest';

import FlexSearch from 'flexsearch';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION,
	BIBLE_SEARCH_RESOURCE_TYPE,
	BibleSearchIndexDataTypeHandler,
	BibleSearchIndexDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-search-index-store';

import {
	IndexedDBBibleSearchIndexStore
} from '$lib/domains/bible/persistence/indexeddb-bible-search-index-store';

import {
	createBibleSearchIndexId,
	type BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	createBrowserTestPublisher,
	createGenericResourceInstallationTestService
} from './support/resource-installation-test-service';

describe(
	'Bible Search Index Resource installation',
	() => {
		it(
			'decodes validates installs and restores a real FlexSearch export through the generic installer',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/search-index/kjvs`;

				const chunks =
					await createFlexSearchExport();

				const service =
					createService(
						publisher,
						resourceId,
						chunks
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toEqual({
					requested: {
						publisher,
						resourceId
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher,
								resourceId
							},

							resourceType:
								BIBLE_SEARCH_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const searchIndexId =
					createBibleSearchIndexId(
						publisher,
						'kjvs'
					);

				const searchIndexStore =
					new IndexedDBBibleSearchIndexStore(
						getApplicationDB
					);

				const installed =
					await searchIndexStore.get(
						searchIndexId
					);

				expect(
					installed
				).toEqual({
					id:
						searchIndexId,

					version:
						'kjvs',

					chunks
				});

				const restoredIndex =
					new FlexSearch.Index();

				for (
					const [
						key,
						data
					] of Object.entries(
						installed!.chunks
					)
				) {
					await restoredIndex.import(
						key,
						data
					);
				}

				expect(
					await restoredIndex.searchAsync(
						'beginning'
					)
				).toContain(
					'1_1_1'
				);

				expect(
					await restoredIndex.searchAsync(
						'earth'
					)
				).toContain(
					'1_1_2'
				);

				const installationId =
					createResourceInstallationId(
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						searchIndexId
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							searchIndexId
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							searchIndexId
						),

					objectType:
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,

					objectId:
						searchIndexId,

					dataType:
						BIBLE_SEARCH_INDEX_DATA_TYPE,

					dataVersion:
						BIBLE_SEARCH_INDEX_DATA_VERSION,

					value: {
						id:
							searchIndexId,
						version:
							'kjvs',
						chunks
					}
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,

					objectId:
						searchIndexId,

					publisher,
					resourceId,
					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							resourceId
						),

					publisher,
					resourceId,
					modifiedAt:
						200
				});
			}
		);

		it(
			'installs nothing when the FlexSearch export is incomplete',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/search-index/kjvs`;

				const chunks =
					await createFlexSearchExport();

				const {
					ctx: _,
					...invalidChunks
				} = chunks;

				const service =
					createService(
						publisher,
						resourceId,
						invalidChunks
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher,
							resourceId
						},

						resourceType:
							BIBLE_SEARCH_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const searchIndexId =
					createBibleSearchIndexId(
						publisher,
						'kjvs'
					);

				const searchIndexStore =
					new IndexedDBBibleSearchIndexStore(
						getApplicationDB
					);

				expect(
					await searchIndexStore.get(
						searchIndexId
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							searchIndexId
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toBeUndefined();
			}
		);
	}
);

async function createFlexSearchExport():
	Promise<BibleSearchIndexChunks> {
	const index =
		new FlexSearch.Index();

	await index.addAsync(
		'1_1_1',
		'Gen 1:1 In the beginning God created the heaven and the earth.'
	);

	await index.addAsync(
		'1_1_2',
		'Gen 1:2 And the earth was without form and void.'
	);

	const chunks:
		Record<string, string> =
		{};

	await index.export(
		(
			key: string,
			data: string | undefined
		) => {
			chunks[key] =
				data !== undefined
					? data
					: '';
		}
	);

	return chunks as
		BibleSearchIndexChunks;
}

function createService(
	publisher: string,
	resourceId: string,
	value: unknown
) {
	return createGenericResourceInstallationTestService(
		createInstaller(),
		{
			publisher,
			resourceId,
			resourceType:
				BIBLE_SEARCH_RESOURCE_TYPE,
			dataType:
				BIBLE_SEARCH_INDEX_DATA_TYPE,
			dataVersion:
				BIBLE_SEARCH_INDEX_DATA_VERSION,
			value
		}
	);
}

function createInstaller():
	GenericResourceInstaller {
	return new GenericResourceInstaller(
		new ResourceDataTypeResolver([
			new BibleSearchIndexDataTypeHandler()
		]),
		new ResourceDomainObjectFactoryResolver([
			new BibleSearchIndexDomainObjectFactory()
		]),
		new IndexedDBGenericResourceInstallationTransaction(
			getApplicationDB
		)
	);
}
