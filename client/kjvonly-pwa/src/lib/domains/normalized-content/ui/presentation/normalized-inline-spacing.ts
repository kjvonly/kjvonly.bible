import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

/**
 * Returns whether the renderer should insert ordinary inter-word spacing before
 * the inline item at `index`.
 *
 * Canonical words do not contain whitespace, so the renderer owns ordinary word
 * separation. Zero-width anchors preserve lexical continuity, while an explicit
 * line break ends the horizontal run. `joinPrevious` suppresses spacing even
 * when another visible word precedes the current word.
 *
 * @param content Canonical inline content in source order.
 * @param index Index of the inline item being rendered.
 * @returns True when one ordinary space should precede the current word.
 */
export function shouldInsertNormalizedWordSeparator(
	content: readonly NormalizedContent[],
	index: number
): boolean {
	const current =
		content[index];

	if (
		!current ||
		current.type !==
			'word' ||
		current.joinPrevious ===
			true
	) {
		return false;
	}

	for (
		let candidateIndex =
			index - 1;
		candidateIndex >= 0;
		candidateIndex--
	) {
		const candidate =
			content[candidateIndex];

		if (!candidate) {
			continue;
		}

		switch (candidate.type) {
			case 'word':
				return true;
			case 'anchor':
				continue;
			case 'line-break':
				return false;
			default:
				return assertUnsupportedSpacingBoundary(
					candidate
				);
		}
	}

	return false;
}

/**
 * Guards spacing semantics when the shared inline contract gains a new node type.
 * Every new inline type must explicitly decide whether it preserves or breaks the
 * current horizontal word run.
 */
function assertUnsupportedSpacingBoundary(
	item: never
): never {
	throw new Error(
		`Unsupported normalized inline spacing boundary: ${(item as { type?: unknown }).type ?? 'missing'}`
	);
}
