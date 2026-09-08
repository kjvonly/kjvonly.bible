import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterStore
} from './chapter-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

const BIBLE_CHAPTER_OBJECT_TYPE =
	'bible/chapter';

export class IndexedDBChapterStore
	implements ChapterStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) { }

	async get(
		id: string
	): Promise<
		Chapter |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					BIBLE_CHAPTER_OBJECT_TYPE,
					id
				)
			);

		if (!stored) {
			return undefined;
		}

		return stored.value as Chapter;
	}

	async put(
		chapter: Chapter
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}