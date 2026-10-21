import type {
	NormalizedContentTextMarkupContentMap,
	NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';

/**
 * Creates a mutable Reader draft without sharing nested markup state with the
 * accepted Domain object.
 *
 * `defineProperty` is intentional because source-authored block IDs may be
 * JavaScript prototype property names such as `__proto__`.
 */
export function cloneNormalizedContentTextMarkupMap(
	markings: NormalizedContentTextMarkupMap
): NormalizedContentTextMarkupMap {
	const clone: NormalizedContentTextMarkupMap = {};

	for (
		const [blockId, contentMarkings] of
		Object.entries(markings)
	) {
		defineOwnProperty(
			clone,
			blockId,
			cloneContentMarkings(
				contentMarkings
			)
		);
	}

	return clone;
}

function cloneContentMarkings(
	markings: NormalizedContentTextMarkupContentMap
): NormalizedContentTextMarkupContentMap {
	const clone:
		NormalizedContentTextMarkupContentMap = {};

	for (
		const [contentIndex, marking] of
		Object.entries(markings)
	) {
		defineOwnProperty(
			clone,
			contentIndex,
			{
				class:
					[...marking.class]
			}
		);
	}

	return clone;
}

function defineOwnProperty<T>(
	record: Record<string, T>,
	key: string,
	value: T
): void {
	Object.defineProperty(
		record,
		key,
		{
			configurable: true,
			enumerable: true,
			writable: true,
			value
		}
	);
}

/**
 * Reports changes to visible word markings, ignoring empty entries left behind
 * when a user toggles a style on and then off. The saved map is still the
 * canonical Domain representation; no extra dirty flag needs synchronization.
 */
export function hasNormalizedContentTextMarkupDraftChanges(
	accepted: NormalizedContentTextMarkupMap,
	draft: NormalizedContentTextMarkupMap
): boolean {
	return hasDifferentWordMarkings(accepted, draft) ||
		hasDifferentWordMarkings(draft, accepted);
}

function hasDifferentWordMarkings(
	left: NormalizedContentTextMarkupMap,
	right: NormalizedContentTextMarkupMap
): boolean {
	for (const [blockId, entries] of Object.entries(left)) {
		const matchingBlock = Object.prototype.hasOwnProperty.call(right, blockId)
			? right[blockId]
			: undefined;
		for (const [index, marking] of Object.entries(entries)) {
			if (marking.class.length === 0) continue;
			const matchingMarking = matchingBlock && Object.prototype.hasOwnProperty.call(matchingBlock, index)
				? matchingBlock[index]
				: undefined;
			if (!matchingMarking ||
				marking.class.length !== matchingMarking.class.length ||
				marking.class.some((value, position) => value !== matchingMarking.class[position])) {
				return true;
			}
		}
	}
	return false;
}
