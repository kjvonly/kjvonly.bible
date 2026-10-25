import type { HtmlNormalizer } from '@kjvonly/html-normalized-content';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { DictionaryDefinition } from '../../models/dictionary.model';

/**
 * Convert only the selected key's HTML definitions into one canonical document.
 * The shared CLI/parser implementation runs inside the Dictionary definition worker.
 * Joining the HTML before parsing gives all definitions one block-ID namespace.
 * Definitions stay in source order without duplicated DOM IDs across renderers.
 */
export function normalizeDictionaryDefinitions(
	definitions: unknown,
	normalizer: Pick<HtmlNormalizer, 'normalize'>
): NormalizedDocument {
	if (!isWebsterDefinitions(definitions)) {
		throw new Error('Dictionary definition is not valid Webster HTML content.');
	}
	return normalizer.normalize(definitions.map(definition => definition.content).join('\n'));
}

/** Validate the requested HTML value at the normalization boundary, not in the generic chunk reader. */
function isWebsterDefinitions(value: unknown): value is readonly DictionaryDefinition[] {
	return Array.isArray(value) && value.length > 0 && value.every(item =>
		item !== null && typeof item === 'object' && !Array.isArray(item) &&
		typeof item.word === 'string' && item.word.trim().length > 0 &&
		typeof item.content === 'string' && item.content.trim().length > 0
	);
}
