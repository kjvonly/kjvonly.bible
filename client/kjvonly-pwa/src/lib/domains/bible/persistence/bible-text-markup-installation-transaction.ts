import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from './bible-text-markup-store';

import type {
	BibleTextMarkupInstallationStores,
	BibleTextMarkupInstallationTransaction
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-installation-stores';

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

export class IndexedDBBibleTextMarkupInstallationTransaction
	implements BibleTextMarkupInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupInstallationStores
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
			BibleTextMarkupInstallationStores = {
				textMarkup: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										BIBLE_TEXT_MARKUP_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								BibleTextMarkup |
								undefined;
						},

					put:
						async (
							textMarkup
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_TEXT_MARKUP_OBJECT_TYPE,
											textMarkup.id
										),

									objectType:
										BIBLE_TEXT_MARKUP_OBJECT_TYPE,

									objectId:
										textMarkup.id,

									value:
										textMarkup
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
