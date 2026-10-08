import type {
	NormalizedContentAddress
} from './normalized-content-address.model';

/** Presentation classes applied to one canonical Normalized Content word. */
export interface NormalizedContentTextMarkupMarking {
	class: string[];
}

/** Markings keyed by canonical `contentIndex` within one normalized block. */
export type NormalizedContentTextMarkupContentMap =
	Record<
		string,
		NormalizedContentTextMarkupMarking
	>;

/**
 * Whole-word Text Markup keyed by canonical Normalized Content address.
 *
 * The outer key is the exact `blockId`; the inner key is the canonical
 * `contentIndex` inside that block's `content[]`. Only addresses resolving to
 * canonical `word` entries are valid Text Markup targets.
 */
export type NormalizedContentTextMarkupMap =
	Record<
		string,
		NormalizedContentTextMarkupContentMap
	>;

/**
 * Reads one Text Markup marking by exact semantic token address.
 *
 * Own-property lookup is intentional because canonical source block IDs may
 * legally collide with JavaScript prototype property names such as
 * `__proto__`.
 */
export function getNormalizedContentTextMarkupMarking(
	markings: NormalizedContentTextMarkupMap | undefined,
	address: NormalizedContentAddress
): NormalizedContentTextMarkupMarking | undefined {
	if (!markings) {
		return undefined;
	}

	const blockMarkings = getOwnProperty(
		markings,
		address.blockId
	);

	if (!blockMarkings) {
		return undefined;
	}

	return getOwnProperty(
		blockMarkings,
		String(address.contentIndex)
	);
}

function getOwnProperty<T>(
	record: Record<string, T>,
	key: string
): T | undefined {
	if (!Object.prototype.hasOwnProperty.call(record, key)) {
		return undefined;
	}

	return record[key];
}
