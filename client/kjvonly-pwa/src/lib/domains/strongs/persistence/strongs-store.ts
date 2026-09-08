import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

export const STRONGS_DEFINITION_OBJECT_TYPE =
	'strongs/definition';

export interface StrongsStore {
	get(
		id: string
	): Promise<
		Strongs |
		undefined
	>;

	put(
		strongs: Strongs
	): Promise<void>;
}