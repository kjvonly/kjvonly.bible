import type {
	NormalizedContentTextMarkup
} from '../models/normalized-content-text-markup.model';

/** Persistence boundary for accepted Normalized Content Text Markup objects. */
export interface NormalizedContentTextMarkupStore {
	get(
		id: string
	): Promise<
		NormalizedContentTextMarkup |
		undefined
	>;

	put(
		textMarkup:
			NormalizedContentTextMarkup
	): Promise<void>;
}
