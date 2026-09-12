import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE,
	type BibleParagraphsStore
} from './bible-paragraphs-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBibleParagraphsStore
	implements BibleParagraphsStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		BibleParagraphs |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_PARAGRAPHS_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			BibleParagraphs |
			undefined;
	}

	async put(
		paragraphs:
			BibleParagraphs
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
