import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

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