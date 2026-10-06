export type NormalizedMark =
	| 'superscript'
	| 'small';

export type NormalizedMarkElement =
	| 'sup'
	| 'small';

export interface NormalizedMarkPresentation {
	mark: NormalizedMark;
	element: NormalizedMarkElement;
}

/**
 * Canonical outermost-to-innermost wrapper order.
 *
 * This order is independent of publisher/source ordering so rendering remains
 * deterministic when more than one supported mark is present.
 */
export const NORMALIZED_MARK_PRESENTATIONS:
	readonly NormalizedMarkPresentation[] = [
		{
			mark:
				'superscript',
			element:
				'sup'
		},
		{
			mark:
				'small',
			element:
				'small'
		}
	];

export function resolveNormalizedMarks(
	marks: readonly string[] | null | undefined
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
