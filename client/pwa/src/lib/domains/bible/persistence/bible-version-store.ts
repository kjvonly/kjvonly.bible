export const BIBLE_VERSION_OBJECT_TYPE =
	'bible/version';

export const BIBLE_VERSION_DATA_TYPE =
	'kjvonly.bible.version';

import type {
	BibleVersion
} from '../models/bible-version.model';

export interface BibleVersionStore {
	get(
		id: string
	): Promise<
		BibleVersion |
		undefined
	>;

	put(
		bibleVersion:
			BibleVersion
	): Promise<void>;
}