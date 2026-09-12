import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from './bible-paragraphs-store';

import type {
	BibleParagraphsInstallationStores,
	BibleParagraphsInstallationTransaction
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-installation-stores';

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

export class IndexedDBBibleParagraphsInstallationTransaction
	implements BibleParagraphsInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleParagraphsInstallationStores
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
			BibleParagraphsInstallationStores = {
				paragraphs: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										BIBLE_PARAGRAPHS_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								BibleParagraphs |
								undefined;
						},

					put:
						async (
							paragraphs
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_PARAGRAPHS_OBJECT_TYPE,
											paragraphs.id
										),

									objectType:
										BIBLE_PARAGRAPHS_OBJECT_TYPE,

									objectId:
										paragraphs.id,

									value:
										paragraphs
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
