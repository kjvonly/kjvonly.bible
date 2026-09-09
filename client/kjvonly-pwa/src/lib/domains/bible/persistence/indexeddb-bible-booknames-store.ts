import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE,
	type BibleBooknamesStore
} from './bible-booknames-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBibleBooknamesStore
	implements BibleBooknamesStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		BibleBooknames |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_BOOKNAMES_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			BibleBooknames |
			undefined;
	}

	async put(
		booknames:
			BibleBooknames
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
