import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveResourceIconID
} from './file-manager-resource-icon-resolver';

describe(
	'resolveResourceIconID',
	() => {
		it(
			'prefers a recognized optional publisher icon ID',
			() => {
				expect(
					resolveResourceIconID(
						'article',
						'kjvonly.normalized-document'
					)
				).toBe('article');

				expect(
					resolveResourceIconID(
						'notes',
						'kjvonly.normalized-document'
					)
				).toBe('notes');

				expect(
					resolveResourceIconID(
						'post',
						'kjvonly.normalized-document'
					)
				).toBe('post');
			}
		);

		it(
			'does not interpret content-kind aliases as icon IDs',
			() => {
				expect(
					resolveResourceIconID(
						'sermon',
						'kjvonly.normalized-document'
					)
				).toBe('document');

				expect(
					resolveResourceIconID(
						'blog',
						'kjvonly.normalized-document'
					)
				).toBe('document');
			}
		);

		it(
			'falls back only to dataType when icon metadata is absent or unknown',
			() => {
				expect(
					resolveResourceIconID(
						undefined,
						'kjvonly.audio'
					)
				).toBe('audio');

				expect(
					resolveResourceIconID(
						'custom-icon',
						'kjvonly.note/v1'
					)
				).toBe('notes');

				expect(
					resolveResourceIconID(
						undefined,
						'kjvonly.normalized-document'
					)
				).toBe('document');
			}
		);
	}
);
