import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_VERSIONS,
	CHAPTERS,
	RESOURCE_INSTALLATIONS,
	BibleDB
} from './bible.db';

import {
	IndexedDBBibleChapterInstallationTransaction
} from './bible-chapter-installation-transaction';

import type {
	IndexedDBTransaction
} from '$lib/infrastructure/persistence/idb.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

describe(
	'IndexedDBBibleChapterInstallationTransaction',
	() => {
		it(
			'runs the installation using the required object stores',
			async () => {
				const db =
					new FakeBibleDB();

				const transaction =
					new IndexedDBBibleChapterInstallationTransaction(
						db
					);

				await transaction.run(
					async () => {}
				);

				expect(
					db.tableNames
				).toEqual([
					CHAPTERS,
					BIBLE_VERSIONS,
					RESOURCE_INSTALLATIONS
				]);
			}
		);

		it(
			'exposes a transaction-scoped ChapterStore',
			async () => {
				const db =
					new FakeBibleDB();

				const transaction =
					new IndexedDBBibleChapterInstallationTransaction(
						db
					);

				const chapter = {
					id:
						'publisher/kjvs/1_1',

					number:
						1,

					bookName:
						'Genesis',

					verses: {},

					verseMap: {},

					footnotes: {}
				};

				await transaction.run(
					async (stores) => {
						await stores.chapters.put(
							chapter
						);

						const result =
							await stores.chapters.get(
								chapter.id
							);

						expect(
							result
						).toEqual(
							chapter
						);
					}
				);

				expect(
					db.getStoredValue(
						CHAPTERS,
						chapter.id
					)
				).toEqual(
					chapter
				);
			}
		);

		it(
			'exposes a transaction-scoped BibleVersionStore',
			async () => {
				const db =
					new FakeBibleDB();

				const transaction =
					new IndexedDBBibleChapterInstallationTransaction(
						db
					);

				const bibleVersion = {
					id:
						'publisher/kjvs',

					publisher:
						'publisher',

					version:
						'kjvs'
				};

				await transaction.run(
					async (stores) => {
						await stores.bibleVersions.put(
							bibleVersion
						);

						const result =
							await stores.bibleVersions.get(
								bibleVersion.id
							);

						expect(
							result
						).toEqual(
							bibleVersion
						);
					}
				);

				expect(
					db.getStoredValue(
						BIBLE_VERSIONS,
						bibleVersion.id
					)
				).toEqual(
					bibleVersion
				);
			}
		);

		it(
			'exposes a transaction-scoped ResourceInstallationStore',
			async () => {
				const db =
					new FakeBibleDB();

				const transaction =
					new IndexedDBBibleChapterInstallationTransaction(
						db
					);

				const objectType =
					'bible/chapter';

				const objectId =
					'publisher/kjvs/1_1';

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								objectType,
								objectId
							),

						objectType,

						objectId,

						publisher:
							'publisher',

						resourceId:
							'kjvonly/bible/chapters/kjvs',

						eventId:
							'event-id',

						modifiedAt:
							123456
					};

				await transaction.run(
					async (stores) => {
						await stores
							.resourceInstallations
							.put(
								installation
							);

						const result =
							await stores
								.resourceInstallations
								.get(
									objectType,
									objectId
								);

						expect(
							result
						).toEqual(
							installation
						);
					}
				);

				expect(
					db.getStoredValue(
						RESOURCE_INSTALLATIONS,
						installation.id
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'returns the installation operation result',
			async () => {
				const db =
					new FakeBibleDB();

				const transaction =
					new IndexedDBBibleChapterInstallationTransaction(
						db
					);

				const result =
					await transaction.run(
						async () =>
							'installation-complete'
					);

				expect(
					result
				).toBe(
					'installation-complete'
				);
			}
		);
	}
);

class FakeBibleDB extends BibleDB {

	tableNames:
		string[] = [];

	private readonly stores =
		new Map<
			string,
			Map<string, object>
		>();

	override async runReadWriteTransaction<
		TResult
	>(
		tableNames: string[],
		operation:
			(
				transaction:
					IndexedDBTransaction
			) => Promise<TResult>
	): Promise<TResult> {
		this.tableNames = [
			...tableNames
		];

		const transaction:
			IndexedDBTransaction = {
				getValue:
					async (
						tableName,
						id
					) => {
						return this.stores
							.get(
								tableName
							)
							?.get(
								id
							);
					},

				putValue:
					async (
						tableName,
						value
					) => {
						let store =
							this.stores.get(
								tableName
							);

						if (!store) {
							store =
								new Map();

							this.stores.set(
								tableName,
								store
							);
						}

						const id =
							(
								value as {
									id: string;
								}
							).id;

						store.set(
							id,
							value
						);

						return id;
					}
			};

		return operation(
			transaction
		);
	}

	getStoredValue(
		tableName: string,
		id: string
	): object | undefined {
		return this.stores
			.get(
				tableName
			)
			?.get(
				id
			);
	}
}