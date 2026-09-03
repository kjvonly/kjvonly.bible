import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

export interface BibleVersionCatalog {
	list(): Promise<
		readonly BibleVersion[]
	>;
}