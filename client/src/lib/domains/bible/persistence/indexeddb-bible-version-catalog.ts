import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	BibleVersionCatalog
} from './bible-version-catalog';

import type {
	BibleDB
} from './bible.db';

import {
	BIBLE_VERSIONS
} from './bible.db';

export class IndexedDBBibleVersionCatalog
	implements BibleVersionCatalog {

	constructor(
		private readonly getDB:
			() => Promise<BibleDB>
	) {}

	async list(): Promise<
		readonly BibleVersion[]
	> {
		const db =
			await this.getDB();

		return await db.getAllValue(
			BIBLE_VERSIONS
		);
	}
}