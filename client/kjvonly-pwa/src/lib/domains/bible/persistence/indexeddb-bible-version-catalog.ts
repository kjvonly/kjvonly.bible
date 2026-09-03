import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	BibleVersionCatalog
} from './bible-version-catalog';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const BIBLE_VERSION_OBJECT_TYPE =
	'bible/version';

export class IndexedDBBibleVersionCatalog
	implements BibleVersionCatalog {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async list(): Promise<
		readonly BibleVersion[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				DOMAIN_OBJECTS,
				OBJECT_TYPE_INDEX,
				BIBLE_VERSION_OBJECT_TYPE
			);

		return stored.map(
			(object) =>
				object.value as BibleVersion
		);
	}
}