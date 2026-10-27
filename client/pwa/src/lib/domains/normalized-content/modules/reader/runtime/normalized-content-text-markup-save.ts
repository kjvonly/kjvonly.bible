import type {
	NormalizedContentTextMarkup,
	NormalizedContentTextMarkupMap
} from '../../../models/normalized-content-text-markup.model';
import { cloneNormalizedContentTextMarkupMap } from '../normalized-content-text-markup-draft';

/** Clone a single signed-in user's draft for persistence without sharing mutable markings. */
export function captureNormalizedContentTextMarkupSave(
	acceptedTextMarkup: NormalizedContentTextMarkup,
	markings: NormalizedContentTextMarkupMap
): NormalizedContentTextMarkup {
	return {
		...acceptedTextMarkup,
		document: { ...acceptedTextMarkup.document },
		markings: cloneNormalizedContentTextMarkupMap(markings)
	};
}
