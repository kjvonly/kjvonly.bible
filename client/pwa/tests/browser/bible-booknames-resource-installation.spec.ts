import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	BibleBooknamesDataTypeHandler,
	BibleBooknamesDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-booknames-store';

import {
	IndexedDBBibleBooknamesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-booknames-store';

import {
	createBibleBooknamesId
} from '$lib/domains/bible/models/bible-booknames.model';

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
	'Bible Booknames Resource installation',
	() => {
		it(
			'decodes validates and installs Bible Booknames into IndexedDB through the generic installer',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/booknames/default`;

				const content =
					createBooknamesContent();

				const service =
					createService(
						publisher,
						resourceId,
						content
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
								BIBLE_BOOKNAMES_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const booknamesId =
					createBibleBooknamesId(
						publisher,
						'default'
					);

				const booknamesStore =
					new IndexedDBBibleBooknamesStore(
						getApplicationDB
					);

				expect(
					await booknamesStore.get(
						booknamesId
					)
				).toEqual({
					id:
						booknamesId,

					...content
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_BOOKNAMES_OBJECT_TYPE,
						booknamesId
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							BIBLE_BOOKNAMES_OBJECT_TYPE,
							booknamesId
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							BIBLE_BOOKNAMES_OBJECT_TYPE,
							booknamesId
						),

					objectType:
						BIBLE_BOOKNAMES_OBJECT_TYPE,

					objectId:
						booknamesId,

					dataType:
						BIBLE_BOOKNAMES_DATA_TYPE,

					dataVersion:
						BIBLE_BOOKNAMES_DATA_VERSION,

					value: {
						id:
							booknamesId,

						...content
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
						BIBLE_BOOKNAMES_OBJECT_TYPE,

					objectId:
						booknamesId,

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
			'installs nothing when Bible Booknames validation fails',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/booknames/default`;

				const invalidContent =
					createBooknamesContent();

				invalidContent
					.booknamesByName
					.Genesis =
						2;

				const service =
					createService(
						publisher,
						resourceId,
						invalidContent
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result.found
				).toBe(
					true
				);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher,
							resourceId
						},

						resourceType:
							BIBLE_BOOKNAMES_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const booknamesId =
					createBibleBooknamesId(
						publisher,
						'default'
					);

				const booknamesStore =
					new IndexedDBBibleBooknamesStore(
						getApplicationDB
					);

				expect(
					await booknamesStore.get(
						booknamesId
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_BOOKNAMES_OBJECT_TYPE,
							booknamesId
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

function createService(
	publisher: string,
	resourceId: string,
	value: unknown
) {
	const genericInstaller =
		new GenericResourceInstaller(
			new ResourceDataTypeResolver([
				new BibleBooknamesDataTypeHandler()
			]),
			new ResourceDomainObjectFactoryResolver([
				new BibleBooknamesDomainObjectFactory()
			]),
			new IndexedDBGenericResourceInstallationTransaction(
				getApplicationDB
			)
		);

	return createGenericResourceInstallationTestService(
		genericInstaller,
		{
			publisher,
			resourceId,
			resourceType:
				BIBLE_BOOKNAMES_RESOURCE_TYPE,
			dataType:
				BIBLE_BOOKNAMES_DATA_TYPE,
			dataVersion:
				BIBLE_BOOKNAMES_DATA_VERSION,
			value,
			modifiedAt:
				200
		}
	);
}

function createBooknamesContent() {
	return {
		booknamesById: {
			'1':
				'Genesis',

			'2':
				'Exodus'
		},

		booknamesByName: {
			Genesis:
				1,

			Exodus:
				2
		},

		shortNames: {
			'1':
				'Gen',

			'2':
				'Exo'
		},

		maxChapterById: {
			'1':
				2,

			'2':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31,

				'2':
					25
			},

			'2': {
				'1':
					22
			}
		}
	};
}
