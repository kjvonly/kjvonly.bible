import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

export const BIBLE_PERICOPES_OBJECT_TYPE =
	'bible/pericopes';

export interface BiblePericopesStore {
	get(
		id: string
	): Promise<
		BiblePericopes |
		undefined
	>;

	put(
		pericopes:
			BiblePericopes
	): Promise<void>;
}
