import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	BibleChapterInstallationStores,
	BibleChapterInstallationTransaction
} from '$lib/domains/bible/resources/chapters/bible-chapter-installation-stores';

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

const BIBLE_CHAPTER_OBJECT_TYPE =
	'bible/chapter';

const BIBLE_VERSION_OBJECT_TYPE =
	'bible/version';

export class IndexedDBBibleChapterInstallationTransaction
	implements BibleChapterInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleChapterInstallationStores
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
			BibleChapterInstallationStores = {

			chapters: {
				get:
					async (
						id
					) => {
						const stored =
							await domainObjects.get(
								createStoredDomainObjectId(
									BIBLE_CHAPTER_OBJECT_TYPE,
									id
								)
							);

						return stored?.value as
							Chapter |
							undefined;
					},

				put:
					async (
						chapter
					) => {
						const stored:
							StoredDomainObject = {
								id:
									createStoredDomainObjectId(
										BIBLE_CHAPTER_OBJECT_TYPE,
										chapter.id
									),

								objectType:
									BIBLE_CHAPTER_OBJECT_TYPE,

								objectId:
									chapter.id,

								value:
									chapter
							};

						await domainObjects.put(
							stored
						);
					}
			},

			bibleVersions: {
				get:
					async (
						id
					) => {
						const stored =
							await domainObjects.get(
								createStoredDomainObjectId(
									BIBLE_VERSION_OBJECT_TYPE,
									id
								)
							);

						return stored?.value as
							BibleVersion |
							undefined;
					},

				put:
					async (
						bibleVersion
					) => {
						const stored:
							StoredDomainObject = {
								id:
									createStoredDomainObjectId(
										BIBLE_VERSION_OBJECT_TYPE,
										bibleVersion.id
									),

								objectType:
									BIBLE_VERSION_OBJECT_TYPE,

								objectId:
									bibleVersion.id,

								value:
									bibleVersion
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
						const id =
							createResourceInstallationId(
								objectType,
								objectId
							);

						return await resourceInstallations.get(
							id
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
				// Transaction may already be aborted.
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