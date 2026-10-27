import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '../chapters/bible-chapter-resource';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '../booknames/bible-booknames-resource';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-resource';


import {
	SearchModuleResourceSelectionContributor
} from './search-module-resource-selection-contributor';

describe(
	'SearchModuleResourceSelectionContributor',
	() => {
		it(
			'owns the Search module Resource requirements',
			() => {
				const selections =
					new SearchModuleResourceSelectionContributor()
						.build({
							originatingSelections: {},
							currentSelections: {
								[BIBLE_SEARCH_RESOURCE_TYPE]:
									createReference(
										'search',
										`kjvonly/bible/search-index/kjvs`
									),
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									createReference(
										'chapters',
										`kjvonly/bible/chapter/kjvs`
									),
								[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
									createReference(
										'booknames',
										`kjvonly/bible/booknames/default`
									),

							}
						});

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_SEARCH_RESOURCE_TYPE,
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'prefers an originating selection over the current global selection',
			() => {
				const originatingChapter =
					createReference(
						'origin',
						`kjvonly/bible/chapter/kjv`
					);

				const selections =
					new SearchModuleResourceSelectionContributor()
						.build({
							originatingSelections: {
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									originatingChapter
							},
							currentSelections: {
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									createReference(
										'global',
										`kjvonly/bible/chapter/kjvs`
									)
							}
						});

				expect(
					selections[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).toEqual(
					originatingChapter
				);

				expect(
					selections[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).not.toBe(
					originatingChapter
				);
			}
		);
	}
);

function createReference(
	publisher: string,
	resourceId: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId
	};
}
