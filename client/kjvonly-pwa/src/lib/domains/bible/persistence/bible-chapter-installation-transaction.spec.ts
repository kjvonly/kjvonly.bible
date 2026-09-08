import {
	describe,
	expect,
	it
} from 'vitest';

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

import {
	IndexedDBBibleChapterInstallationTransaction
} from './bible-chapter-installation-transaction';

describe(
	'IndexedDBBibleChapterInstallationTransaction',
	() => {
		it(
			'runs the installation using the required object stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					createTransaction(
						db
					);

				await transaction.run(
					async () => {}
				);

				expect(
					db.storeNames
				).toEqual([
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS
				]);
			}
		);

		it(
			'exposes a transaction-scoped ChapterStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					createTransaction(
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
					async (
						stores
					) => {
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

				const stored =
					db.getStoredValue(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							'bible/chapter',
							chapter.id
						)
					) as StoredDomainObject;

				expect(
					stored.objectType
				).toBe(
					'bible/chapter'
				);

				expect(
					stored.objectId
				).toBe(
					chapter.id
				);

				expect(
					stored.value
				).toEqual(
					chapter
				);
			}
		);

		it(
			'exposes a transaction-scoped BibleVersionStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					createTransaction(
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
					async (
						stores
					) => {
						await stores
							.bibleVersions
							.put(
								bibleVersion
							);

						const result =
							await stores
								.bibleVersions
								.get(
									bibleVersion.id
								);

						expect(
							result
						).toEqual(
							bibleVersion
						);
					}
				);

				const stored =
					db.getStoredValue(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							'bible/version',
							bibleVersion.id
						)
					) as StoredDomainObject;

				expect(
					stored.objectType
				).toBe(
					'bible/version'
				);

				expect(
					stored.objectId
				).toBe(
					bibleVersion.id
				);

				expect(
					stored.value
				).toEqual(
					bibleVersion
				);
			}
		);

		it(
			'exposes a transaction-scoped ResourceInstallationStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					createTransaction(
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
					async (
						stores
					) => {
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
					new FakeApplicationDB();

				const transaction =
					createTransaction(
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

function createTransaction(
	db: FakeApplicationDB
): IndexedDBBibleChapterInstallationTransaction {

	return new IndexedDBBibleChapterInstallationTransaction(
		async () =>
			db as unknown as ApplicationDB
	);
}

class FakeApplicationDB {

	storeNames:
		string[] = [];

	private readonly stores =
		new Map<
			string,
			Map<string, object>
		>();

	transaction(
		storeNames: string[],
		_mode: string
	) {
		this.storeNames = [
			...storeNames
		];

		return new FakeTransaction(
			this.stores
		);
	}

	getStoredValue(
		storeName: string,
		id: string
	): object | undefined {
		return this.stores
			.get(
				storeName
			)
			?.get(
				id
			);
	}
}

class FakeTransaction {

	readonly done =
		Promise.resolve();

	constructor(
		private readonly stores:
			Map<
				string,
				Map<string, object>
			>
	) {}

	objectStore(
		storeName: string
	): FakeObjectStore {

		let store =
			this.stores.get(
				storeName
			);

		if (!store) {
			store =
				new Map();

			this.stores.set(
				storeName,
				store
			);
		}

		return new FakeObjectStore(
			store
		);
	}

	abort(): void {}
}

class FakeObjectStore {

	constructor(
		private readonly values:
			Map<string, object>
	) {}

	async get(
		id: string
	): Promise<
		object |
		undefined
	> {
		return this.values.get(
			id
		);
	}

	async put(
		value: object
	): Promise<string> {

		const id =
			(
				value as {
					id: string;
				}
			).id;

		this.values.set(
			id,
			value
		);

		return id;
	}
}