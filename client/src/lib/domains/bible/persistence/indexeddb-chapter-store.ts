import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterStore
} from './chapter-store';

import type {
	BibleDB
} from './bible.db';

import {
	CHAPTERS
} from './bible.db';

export class IndexedDBChapterStore
	implements ChapterStore {

	constructor(
		private readonly getDB:
			() => Promise<BibleDB>
	) {}

	async get(
		id: string
	): Promise<
		Chapter |
		undefined
	> {
		const db =
			await this.getDB();

		return await db.getValue(
			CHAPTERS,
			id
		);
	}

	async put(
		chapter:
			Chapter
	): Promise<void> {
		const db =
			await this.getDB();

		await db.putValue(
			CHAPTERS,
			chapter
		);
	}
}