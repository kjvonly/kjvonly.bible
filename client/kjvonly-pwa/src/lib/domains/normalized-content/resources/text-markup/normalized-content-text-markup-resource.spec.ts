import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId,
	parseNormalizedContentTextMarkupResourceId
} from './normalized-content-text-markup-resource';

describe(
	'Normalized Content Text Markup Resource contract',
	() => {
		it(
			'defines the application and semantic contract',
			() => {
				expect(
					NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE
				).toBe(
					'normalized-content/text-markup'
				);
				expect(
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE
				).toBe(
					'kjvonly.normalized-content.text-markup'
				);
				expect(
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
				).toBe(1);
			}
		);

		it(
			'round-trips an opaque target Resource ID and exact snapshot revision',
			() => {
				const resourceId =
					createNormalizedContentTextMarkupResourceId(
						'document-publisher',
						'kjvonly/sermons/grace%and/truth',
						42
					);

				expect(resourceId).toBe(
					'kjvonly/normalized-content/text-markup/document-publisher/kjvonly%2Fsermons%2Fgrace%25and%2Ftruth/42'
				);

				expect(
					parseNormalizedContentTextMarkupResourceId(
						resourceId
					)
				).toEqual({
					documentPublisher:
						'document-publisher',
					documentResourceId:
						'kjvonly/sermons/grace%and/truth',
					documentModifiedAt:
						42
				});
			}
		);

		it.each([
			'other/prefix/document/resource/1',
			'kjvonly/normalized-content/text-markup/document/resource',
			'kjvonly/normalized-content/text-markup/document/resource/-1',
			'kjvonly/normalized-content/text-markup/document/resource/01',
			'kjvonly/normalized-content/text-markup/document/%2f/1'
		])(
			'rejects non-canonical Resource IDs: %s',
			(resourceId) => {
				expect(
					() =>
						parseNormalizedContentTextMarkupResourceId(
							resourceId
						)
				).toThrow();
			}
		);
	}
);
