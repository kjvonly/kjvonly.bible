import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNormalizedContentTextMarkupId,
	parseNormalizedContentTextMarkupId
} from './normalized-content-text-markup.model';

describe(
	'Normalized Content Text Markup identity',
	() => {
		it(
			'round-trips an opaque document Resource ID and snapshot revision',
			() => {
				const id =
					createNormalizedContentTextMarkupId(
						'user-publisher',
						'document-publisher',
						'kjvonly/sermons/grace%and/truth',
						42
					);

				expect(id).toBe(
					'user-publisher/document-publisher/kjvonly%2Fsermons%2Fgrace%25and%2Ftruth/42'
				);

				expect(
					parseNormalizedContentTextMarkupId(
						id
					)
				).toEqual({
					publisher:
						'user-publisher',
					document: {
						publisher:
							'document-publisher',
						resourceId:
							'kjvonly/sermons/grace%and/truth',
						modifiedAt:
							42
					}
				});
			}
		);

		it(
			'changes identity when the target document revision changes',
			() => {
				expect(
					createNormalizedContentTextMarkupId(
						'user',
						'document',
						'resource',
						1
					)
				).not.toBe(
					createNormalizedContentTextMarkupId(
						'user',
						'document',
						'resource',
						2
					)
				);
			}
		);

		it.each([
			'',
			'user/document/resource',
			'user/document/resource/not-a-number',
			'user/document/resource/01',
			'user/document/%2f/1'
		])(
			'rejects non-canonical identities: %s',
			(id) => {
				expect(
					() =>
						parseNormalizedContentTextMarkupId(
							id
						)
				).toThrow();
			}
		);
	}
);
