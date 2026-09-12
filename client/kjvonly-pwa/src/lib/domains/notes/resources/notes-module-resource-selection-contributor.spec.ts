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
	NotesModuleResourceSelectionContributor
} from './notes-module-resource-selection-contributor';

describe(
	'NotesModuleResourceSelectionContributor',
	() => {
		it(
			'owns the Notes module Resource requirements',
			() => {
				const selections =
					new NotesModuleResourceSelectionContributor()
						.build({
							originatingSelections: {},
							currentSelections: {
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
								[BIBLE_SEARCH_RESOURCE_TYPE]:
									createReference(
										'search',
										`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
									)
							}
						});

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_CHAPTER_RESOURCE_TYPE,
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
