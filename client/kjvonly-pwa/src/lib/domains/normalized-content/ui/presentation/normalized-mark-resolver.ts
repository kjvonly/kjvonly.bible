import {
	NORMALIZED_MARK_NAMES,
	type NormalizedMark
} from '@kjvonly/normalized-content';

/** HTML element used to render one canonical normalized inline mark. */
export type NormalizedMarkElement =
	| 'sup'
	| 'sub'
	| 'u'
	| 's'
	| 'small'
	| 'code'
	| 'mark';

/** Presentation mapping for one canonical normalized inline mark. */
export interface NormalizedMarkPresentation {
	/** Canonical mark stored on the normalized word. */
	mark: NormalizedMark;

	/** Semantic HTML element used to present the mark. */
	element: NormalizedMarkElement;
}

/**
 * Closed mapping from the shared NormalizedDocument mark vocabulary to semantic
 * HTML elements.
 *
 * Keeping this as an exhaustive Record makes renderer drift visible at compile
 * time when the shared contract adds or changes a canonical mark.
 */
const NORMALIZED_MARK_ELEMENT_MAP: Readonly<
	Record<
		NormalizedMark,
		NormalizedMarkElement
	>
> = {
	superscript: 'sup',
	subscript: 'sub',
	underline: 'u',
	strikethrough: 's',
	small: 'small',
	code: 'code',
	highlight: 'mark'
};

/**
 * Canonical outermost-to-innermost wrapper order for normalized inline marks.
 *
 * The shared vocabulary owns mark identity and order. The renderer owns only
 * the corresponding presentation element.
 */
export const NORMALIZED_MARK_PRESENTATIONS:
	readonly NormalizedMarkPresentation[] =
	NORMALIZED_MARK_NAMES.map(
		(mark) => ({
			mark,
			element:
				NORMALIZED_MARK_ELEMENT_MAP[
					mark
				]
		})
	);

/**
 * Resolves the canonical marks present on one word into deterministic renderer
 * wrapper order.
 *
 * @param marks Canonical marks attached to the normalized word.
 * @returns Presentation mappings for the marks that are present.
 */
export function resolveNormalizedMarks(
	marks: readonly NormalizedMark[] | undefined
): NormalizedMarkPresentation[] {
	if (
		!marks ||
		marks.length ===
			0
	) {
		return [];
	}

	const presentMarks =
		new Set(
			marks
		);

	return NORMALIZED_MARK_PRESENTATIONS.filter(
		(presentation) =>
			presentMarks.has(
				presentation.mark
			)
	);
}
