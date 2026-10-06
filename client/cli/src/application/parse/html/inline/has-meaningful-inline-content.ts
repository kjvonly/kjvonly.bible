import type {
	NormalizedContent
} from '#domain/normalized-content/models/normalized-content.model.js';

/**
 * Returns true when inline conversion produced content that should materialize
 * as a normalized block rather than an empty structural shell.
 */
export function hasMeaningfulInlineContent(
	content: readonly NormalizedContent[]
): boolean {
	return content.some(
		entry =>
			entry.type ===
				'word' ||
			entry.type ===
				'anchor' ||
			entry.type ===
				'line-break'
	);
}
