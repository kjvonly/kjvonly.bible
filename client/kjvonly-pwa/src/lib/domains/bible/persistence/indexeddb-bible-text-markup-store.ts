import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE,
	type BibleTextMarkupStore
} from './bible-text-markup-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBibleTextMarkupStore
	implements BibleTextMarkupStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		BibleTextMarkup |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_TEXT_MARKUP_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			BibleTextMarkup |
			undefined;
	}

	async put(
		textMarkup:
			BibleTextMarkup
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
