import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	BIBLE_PERICOPES_OBJECT_TYPE,
	type BiblePericopesStore
} from './bible-pericopes-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBiblePericopesStore
	implements BiblePericopesStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		BiblePericopes |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_PERICOPES_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			BiblePericopes |
			undefined;
	}

	async put(
		pericopes:
			BiblePericopes
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
