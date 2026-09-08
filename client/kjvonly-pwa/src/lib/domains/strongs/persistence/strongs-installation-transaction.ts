import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from './strongs-store';

import type {
	StrongsInstallationStores,
	StrongsInstallationTransaction
} from '$lib/domains/strongs/resources/definitions/strongs-installation-stores';

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

export class IndexedDBStrongsInstallationTransaction
	implements StrongsInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					StrongsInstallationStores
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
			StrongsInstallationStores = {
				strongs: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										STRONGS_DEFINITION_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								| Strongs
								| undefined;
						},

					put:
						async (
							strongs
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											STRONGS_DEFINITION_OBJECT_TYPE,
											strongs.id
										),

									objectType:
										STRONGS_DEFINITION_OBJECT_TYPE,

									objectId:
										strongs.id,

									value:
										strongs
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
								| ResourceInstallation
								| undefined;
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