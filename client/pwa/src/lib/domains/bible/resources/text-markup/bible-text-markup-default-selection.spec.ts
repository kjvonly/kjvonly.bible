import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '../chapters/bible-chapter-resource';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-resource';

import {
	createDefaultBibleTextMarkupSelection
} from './bible-text-markup-default-selection';

describe(
	'createDefaultBibleTextMarkupSelection',
	() => {
		it(
			'uses the current user as publisher and the selected Bible version as the Text Markup name',
			() => {
				expect(
					createDefaultBibleTextMarkupSelection(
						'user-pubkey',
						{
							publisher:
								'bible-publisher',

							resourceId:
								`kjvonly/bible/chapter/kjvs`
						}
					)
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`kjvonly/bible/text-markup/kjvs`
				});
			}
		);

		it(
			'rejects a non-Chapter Resource source',
			() => {
				expect(
					() =>
						createDefaultBibleTextMarkupSelection(
							'user-pubkey',
							{
								publisher:
									'bible-publisher',

								resourceId:
									'kjvonly/bible/booknames/default'
							}
						)
				).toThrow(
					'Invalid Bible Chapter Resource ID: kjvonly/bible/booknames/default'
				);
			}
		);

		it(
			'requires a selected Chapter Resource source rather than an individual chapter Resource',
			() => {
				expect(
					() =>
						createDefaultBibleTextMarkupSelection(
							'user-pubkey',
							{
								publisher:
									'bible-publisher',

								resourceId:
									`kjvonly/bible/chapter/kjvs/1_1`
							}
						)
				).toThrow(
					`Invalid Bible Chapter Resource source: kjvonly/bible/chapter/kjvs/1_1`
				);
			}
		);
	}
);
