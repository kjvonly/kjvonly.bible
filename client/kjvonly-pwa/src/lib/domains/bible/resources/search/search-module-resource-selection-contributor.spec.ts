import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

import {
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

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
										`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
									),
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									createReference(
										'chapters',
										`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
									),
								[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
									createReference(
										'booknames',
										`${BIBLE_BOOKNAMES_RESOURCE_TYPE}/default`
									),
								[STRONGS_RESOURCE_TYPE]:
									createReference(
										'strongs',
										`${STRONGS_RESOURCE_TYPE}/kjvs`
									)
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
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
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
										`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
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
