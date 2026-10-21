import type { HtmlNormalizer } from '@kjvonly/html-normalized-content';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { DictionaryDefinition } from '../../models/dictionary.model';

/**
 * Convert only the selected headword's HTML definitions into one canonical document.
 * The shared CLI/parser implementation runs inside the Dictionary definition worker.
 * Joining the HTML before parsing gives all definitions one block-ID namespace.
 * Definitions stay in source order without duplicated DOM IDs across renderers.
 */
export function normalizeDictionaryDefinitions(
	definitions: readonly DictionaryDefinition[],
	normalizer: Pick<HtmlNormalizer, 'normalize'>
): NormalizedDocument {
	return normalizer.normalize(definitions.map(definition => definition.content).join('\n'));
}
