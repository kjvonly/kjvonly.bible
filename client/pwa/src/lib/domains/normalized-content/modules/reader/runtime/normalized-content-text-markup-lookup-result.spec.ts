import { describe, expect, it } from 'vitest';
import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES
} from '../../../models/normalized-content-navigation.model';
import { parseNormalizedContentTextMarkupLookupResult } from './normalized-content-text-markup-lookup-result';

const markup = {
	id: 'test-id', document: { publisher: 'document-owner', resourceId: 'r1', modifiedAt: 42 }, markings: {}
};

describe('parseNormalizedContentTextMarkupLookupResult', () => {
	it('accepts the two Continue outcomes without a markup payload', () => {
		for (const outcome of [
			NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW,
			NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP
		]) {
			expect(parseNormalizedContentTextMarkupLookupResult({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
				outcome
			})).toEqual({ outcome });
		}
	});
	it('requires accepted markup for loaded and local outcomes', () => {
		expect(parseNormalizedContentTextMarkupLookupResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED
		})).toBeUndefined();
		expect(parseNormalizedContentTextMarkupLookupResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED,
			publisher: 'user-a', markup
		})).toEqual({ outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED,
			publisher: 'user-a', markup });
		expect(parseNormalizedContentTextMarkupLookupResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL,
			publisher: 'user-a', markup
		})).toEqual({ outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL,
			publisher: 'user-a', markup });
	});
	it('ignores unrelated and invalid results', () => {
		expect(parseNormalizedContentTextMarkupLookupResult('unrelated')).toBeUndefined();
		expect(parseNormalizedContentTextMarkupLookupResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED
		})).toBeUndefined();
		expect(parseNormalizedContentTextMarkupLookupResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: 'unexpected'
		})).toBeUndefined();
	});
});
