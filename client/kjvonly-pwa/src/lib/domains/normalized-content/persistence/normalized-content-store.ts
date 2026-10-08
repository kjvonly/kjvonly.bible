import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

export interface NormalizedContentStore {
	get(
		id: string
	): Promise<
		NormalizedDocument |
		undefined
	>;

	put(
		id: string,
		document: NormalizedDocument
	): Promise<void>;
}
