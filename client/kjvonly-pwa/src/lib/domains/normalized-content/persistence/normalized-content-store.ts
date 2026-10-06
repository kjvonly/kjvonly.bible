import type {
	NormalizedDocument
} from '../models/normalized-document.model';

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
