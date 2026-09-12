import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from './bible-booknames-store';

import type {
	BibleBooknamesInstallationStores,
	BibleBooknamesInstallationTransaction
} from '$lib/domains/bible/resources/booknames/bible-booknames-installation-stores';

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

export class IndexedDBBibleBooknamesInstallationTransaction
	implements BibleBooknamesInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleBooknamesInstallationStores
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
			BibleBooknamesInstallationStores = {
				booknames: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										BIBLE_BOOKNAMES_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								BibleBooknames |
								undefined;
						},

					put:
						async (
							booknames
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_BOOKNAMES_OBJECT_TYPE,
											booknames.id
										),

									objectType:
										BIBLE_BOOKNAMES_OBJECT_TYPE,

									objectId:
										booknames.id,

									value:
										booknames
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
