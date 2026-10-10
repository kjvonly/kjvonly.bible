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
