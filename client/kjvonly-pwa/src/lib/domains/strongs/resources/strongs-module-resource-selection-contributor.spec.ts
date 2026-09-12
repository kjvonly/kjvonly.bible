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
	StrongsModuleResourceSelectionContributor
} from './strongs-module-resource-selection-contributor';

describe(
	'StrongsModuleResourceSelectionContributor',
	() => {
		it(
			"owns the Strong's module Resource requirements",
			() => {
				const selections =
					new StrongsModuleResourceSelectionContributor()
						.build({
							originatingSelections: {},
							currentSelections: {
								[STRONGS_RESOURCE_TYPE]:
									createReference(
										'strongs',
										`${STRONGS_RESOURCE_TYPE}/kjvs`
									),
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									createReference(
										'chapters',
										`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
									),
								[BIBLE_SEARCH_RESOURCE_TYPE]:
									createReference(
										'search',
										`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
									),
								[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
									createReference(
										'booknames',
										`${BIBLE_BOOKNAMES_RESOURCE_TYPE}/default`
									)
							}
						});

				expect(
					Object.keys(selections)
				).toEqual([
					STRONGS_RESOURCE_TYPE,
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_SEARCH_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
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
