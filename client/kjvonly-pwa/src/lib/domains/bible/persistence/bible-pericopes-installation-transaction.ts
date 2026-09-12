import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from './bible-pericopes-store';

import type {
	BiblePericopesInstallationStores,
	BiblePericopesInstallationTransaction
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-installation-stores';

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

export class IndexedDBBiblePericopesInstallationTransaction
	implements BiblePericopesInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BiblePericopesInstallationStores
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
			BiblePericopesInstallationStores = {
				pericopes: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										BIBLE_PERICOPES_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								BiblePericopes |
								undefined;
						},

					put:
						async (
							pericopes
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_PERICOPES_OBJECT_TYPE,
											pericopes.id
										),

									objectType:
										BIBLE_PERICOPES_OBJECT_TYPE,

									objectId:
										pericopes.id,

									value:
										pericopes
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
