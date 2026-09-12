import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-interpreter';

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
								`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
						}
					)
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/kjvs`
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
					'Invalid Bible Chapter Resource Type: kjvonly/bible/booknames'
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
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs/1_1`
							}
						)
				).toThrow(
					`Invalid Bible Chapter Resource source: ${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs/1_1`
				);
			}
		);
	}
);
