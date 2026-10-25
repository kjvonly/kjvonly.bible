import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	ModuleResourceSelectionBuildContext
} from '$lib/application';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from './chapters/bible-chapter-resource';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from './booknames/bible-booknames-resource';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from './paragraphs/bible-paragraphs-resource';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from './pericopes/bible-pericopes-resource';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from './search/bible-search-index-resource';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './text-markup/bible-text-markup-resource';


import {
	NOTES_RESOURCE_TYPE
} from '$lib/domains/notes';

import {
	BibleModuleResourceSelectionContributor
} from './bible-module-resource-selection-contributor';

describe(
	'BibleModuleResourceSelectionContributor',
	() => {
		it(
			'owns the Bible module Resource requirements',
			() => {
				const currentSelections = {
					[BIBLE_CHAPTER_RESOURCE_TYPE]:
						createReference(
							'bible',
							`kjvonly/bible/chapter/kjvs`
						),
					[BIBLE_PARAGRAPHS_RESOURCE_TYPE]:
						createReference(
							'paragraphs',
							`kjvonly/bible/paragraphs/default`
						),
					[BIBLE_PERICOPES_RESOURCE_TYPE]:
						createReference(
							'pericopes',
							`kjvonly/bible/pericopes/default`
						),
					[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
						createReference(
							'booknames',
							`kjvonly/bible/booknames/default`
						),
					[BIBLE_SEARCH_RESOURCE_TYPE]:
						createReference(
							'search',
							`kjvonly/bible/search-index/kjvs`
						)
				};

				const selections =
					createContributor(
						'user-pubkey'
					).build(
						createContext(
							currentSelections
						)
					);

				expect(Object.keys(selections)).toEqual(
					expect.arrayContaining([
						BIBLE_CHAPTER_RESOURCE_TYPE,
						BIBLE_PARAGRAPHS_RESOURCE_TYPE,
						BIBLE_PERICOPES_RESOURCE_TYPE,
						BIBLE_BOOKNAMES_RESOURCE_TYPE,
						BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
						NOTES_RESOURCE_TYPE
					])
				);

				expect(
					selections[
					BIBLE_SEARCH_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);

		it(
			'derives the default Notes selection from the current user',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build(
						createContext({})
					);

				expect(
					selections[
					NOTES_RESOURCE_TYPE
					]
				).toEqual({
					publisher:
						'user-pubkey',
					resourceId:
						'kjvonly/notes/note/default'
				});
			}
		);

		it(
			'preserves an existing Notes selection',
			() => {
				const selectedNotes =
					createReference(
						'other-publisher',
						'kjvonly/notes/note/study'
					);

				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {
							[NOTES_RESOURCE_TYPE]:
								selectedNotes
						},
						currentSelections: {}
					});

				expect(
					selections[
					NOTES_RESOURCE_TYPE
					]
				).toEqual(
					selectedNotes
				);
			}
		);

		it(
			'derives the default Text Markup selection from the current user and selected Bible version',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build(
						createContext({
							[BIBLE_CHAPTER_RESOURCE_TYPE]:
								createReference(
									'bible-publisher',
									`kjvonly/bible/chapter/kjvs`
								)
						})
					);

				expect(
					selections[
					BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]
				).toEqual({
					publisher:
						'user-pubkey',
					resourceId:
						`kjvonly/bible/text-markup/kjvs`
				});
			}
		);

		it(
			'preserves an existing Text Markup selection',
			() => {
				const selectedMarkup =
					createReference(
						'other-publisher',
						`kjvonly/bible/text-markup/study`
					);

				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {
							[BIBLE_TEXT_MARKUP_RESOURCE_TYPE]:
								selectedMarkup
						},
						currentSelections: {
							[BIBLE_CHAPTER_RESOURCE_TYPE]:
								createReference(
									'bible-publisher',
									`kjvonly/bible/chapter/kjvs`
								)
						}
					});

				expect(
					selections[
					BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]
				).toEqual(
					selectedMarkup
				);
			}
		);

		it(
			'prefers originating Bible selections over current global selections',
			() => {
				const originatingChapter =
					createReference(
						'origin',
						`kjvonly/bible/chapter/kjv`
					);

				const selections =
					createContributor(
						'user-pubkey'
					).build({
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
						BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]?.resourceId
				).toBe(
					`kjvonly/bible/text-markup/kjv`
				);
			}
		);

		it(
			'leaves Text Markup missing when the selected Chapter source is missing',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build(
						createContext({})
					);

				expect(
					selections[
					BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);

		it(
			'leaves Text Markup missing when no current user is available',
			() => {
				const selections =
					createContributor().build(
						createContext({
							[BIBLE_CHAPTER_RESOURCE_TYPE]:
								createReference(
									'bible-publisher',
									`kjvonly/bible/chapter/kjvs`
								)
						})
					);

				expect(
					selections[
					BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]
				).toBeUndefined();

				expect(
					selections[
					NOTES_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);
	}
);

function createContributor(
	pubkey?: string
): BibleModuleResourceSelectionContributor {
	return new BibleModuleResourceSelectionContributor(
		{
			tryGetUserId() {
				return pubkey;
			}
		}
	);
}

function createContext(
	currentSelections:
		ModuleResourceSelectionBuildContext[
		'currentSelections'
		]
): ModuleResourceSelectionBuildContext {
	return {
		originatingSelections: {},
		currentSelections
	};
}

function createReference(
	publisher: string,
	resourceId: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId
	};
}
