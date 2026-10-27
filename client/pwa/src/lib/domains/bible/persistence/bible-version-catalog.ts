import type {
	BibleVersion
} from '../models/bible-version.model';

export interface BibleVersionCatalog {
	list(): Promise<
		readonly BibleVersion[]
	>;
}