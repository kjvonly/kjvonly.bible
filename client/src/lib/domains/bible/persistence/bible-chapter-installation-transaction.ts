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
	BIBLE_VERSIONS,
	CHAPTERS,
	RESOURCE_INSTALLATIONS,
	type BibleDB
} from './bible.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

export class IndexedDBBibleChapterInstallationTransaction
	implements BibleChapterInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<BibleDB>
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
		return db.runReadWriteTransaction(
			[
				CHAPTERS,
				BIBLE_VERSIONS,
				RESOURCE_INSTALLATIONS
			],
			async (transaction) => {
				const stores:
					BibleChapterInstallationStores = {
						chapters: {
							get:
								async (
									id
								) => {
									return await transaction.getValue(
										CHAPTERS,
										id
									) as Chapter |
										undefined;
								},

							put:
								async (
									chapter
								) => {
									await transaction.putValue(
										CHAPTERS,
										chapter
									);
								}
						},

						bibleVersions: {
							get:
								async (
									id
								) => {
									return await transaction.getValue(
										BIBLE_VERSIONS,
										id
									) as BibleVersion |
										undefined;
								},

							put:
								async (
									bibleVersion
								) => {
									await transaction.putValue(
										BIBLE_VERSIONS,
										bibleVersion
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

									return await transaction.getValue(
										RESOURCE_INSTALLATIONS,
										id
									) as ResourceInstallation |
										undefined;
								},

							put:
								async (
									installation
								) => {
									await transaction.putValue(
										RESOURCE_INSTALLATIONS,
										installation
									);
								}
						}
					};

				return operation(
					stores
				);
			}
		);
	}
}