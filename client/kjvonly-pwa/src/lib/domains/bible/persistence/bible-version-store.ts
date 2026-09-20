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