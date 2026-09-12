import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE,
	type BibleSearchIndexStore
} from './bible-search-index-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBibleSearchIndexStore
	implements BibleSearchIndexStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		BibleSearchIndex |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_SEARCH_INDEX_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			BibleSearchIndex |
			undefined;
	}

	async put(
		searchIndex:
			BibleSearchIndex
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						searchIndex.id
					),

				objectType:
					BIBLE_SEARCH_INDEX_OBJECT_TYPE,

				objectId:
					searchIndex.id,

				value:
					searchIndex
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
