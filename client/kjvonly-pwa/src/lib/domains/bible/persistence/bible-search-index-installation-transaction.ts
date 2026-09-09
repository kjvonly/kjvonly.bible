import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from './bible-search-index-store';

import type {
	BibleSearchIndexInstallationStores,
	BibleSearchIndexInstallationTransaction
} from '$lib/domains/bible/resources/search/bible-search-index-installation-stores';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

export class IndexedDBBibleSearchIndexInstallationTransaction
	implements BibleSearchIndexInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleSearchIndexInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const resourceInstallations =
			transaction.objectStore(
				RESOURCE_INSTALLATIONS
			);

		const stores:
			BibleSearchIndexInstallationStores = {
				searchIndexes: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										BIBLE_SEARCH_INDEX_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								BibleSearchIndex |
								undefined;
						},

					put:
						async (
							searchIndex
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_SEARCH_INDEX_OBJECT_TYPE,
											searchIndex.id
										),

									objectType:
										BIBLE_SEARCH_INDEX_OBJECT_TYPE,

									objectId:
										searchIndex.id,

									value:
										searchIndex
								};

							await domainObjects.put(
								stored
							);
						}
				},

				resourceInstallations: {
					get:
						async (
							objectType,
							objectId
						) => {
							return await resourceInstallations.get(
								createResourceInstallationId(
									objectType,
									objectId
								)
							) as
								ResourceInstallation |
								undefined;
						},

					put:
						async (
							installation
						) => {
							await resourceInstallations.put(
								installation
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}
