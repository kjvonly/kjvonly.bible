import type { NavigationStateValue } from '$lib/application';
import type { NormalizedContentTextMarkup } from '../../../models/normalized-content-text-markup.model';
import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES,
	type NormalizedContentTextMarkupLookupOutcome
} from '../../../models/normalized-content-navigation.model';

export type NormalizedContentTextMarkupLookupResult =
	| { readonly outcome: typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED |
		typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL;
		readonly publisher: string; readonly markup: NormalizedContentTextMarkup }
	| { readonly outcome: Exclude<NormalizedContentTextMarkupLookupOutcome,
		typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED |
		typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL> };

/** Parses a completed lookup outcome. A successful lookup includes its accepted markup. */
export function parseNormalizedContentTextMarkupLookupResult(
	result: NavigationStateValue
): NormalizedContentTextMarkupLookupResult | undefined {
	if (!result || typeof result !== 'object' || Array.isArray(result)) {
		return undefined;
	}
	if (result.type !== NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP) {
		return undefined;
	}
	if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW ||
		result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP) {
		return { outcome: result.outcome };
	}
	if (result.outcome !== NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED &&
		result.outcome !== NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL) {
		return undefined;
	}
	const rawMarkup: unknown = result.markup;
	if (!rawMarkup || typeof rawMarkup !== 'object' || Array.isArray(rawMarkup)) {
		return undefined;
	}
	const markup = rawMarkup as Record<string, unknown>;
	const rawDocument = markup.document;
	if (!rawDocument || typeof rawDocument !== 'object' || Array.isArray(rawDocument)) {
		return undefined;
	}
	const document = rawDocument as Record<string, unknown>;
	if (typeof markup.id !== 'string' ||
		typeof document.publisher !== 'string' ||
		typeof document.resourceId !== 'string' ||
		typeof document.modifiedAt !== 'number' ||
		!markup.markings || typeof markup.markings !== 'object' || Array.isArray(markup.markings) ||
		typeof result.publisher !== 'string') {
		return undefined;
	}
	return {
		outcome: result.outcome,
		publisher: result.publisher,
		markup: markup as unknown as NormalizedContentTextMarkup
	};
}
