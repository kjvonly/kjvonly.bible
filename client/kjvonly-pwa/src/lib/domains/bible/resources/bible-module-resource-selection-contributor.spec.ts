import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ModuleResourceSelectionBuildContext
} from '$lib/application/resources/module-resource-selection-contributor';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-interpreter';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-interpreter';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-interpreter';

import {
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

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
							`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
						),
					[BIBLE_PARAGRAPHS_RESOURCE_TYPE]:
						createReference(
							'paragraphs',
							`${BIBLE_PARAGRAPHS_RESOURCE_TYPE}/default`
						),
					[BIBLE_PERICOPES_RESOURCE_TYPE]:
						createReference(
							'pericopes',
							`${BIBLE_PERICOPES_RESOURCE_TYPE}/default`
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
						),
					[BIBLE_SEARCH_RESOURCE_TYPE]:
						createReference(
							'search',
							`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
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

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_PARAGRAPHS_RESOURCE_TYPE,
					BIBLE_PERICOPES_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE,
					STRONGS_RESOURCE_TYPE,
					BIBLE_TEXT_MARKUP_RESOURCE_TYPE
				]);

				expect(
					selections[
						BIBLE_SEARCH_RESOURCE_TYPE
					]
				).toBeUndefined();
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
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
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
						`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/kjvs`
				});
			}
		);

		it(
			'preserves an existing Text Markup selection',
			() => {
				const selectedMarkup =
					createReference(
						'other-publisher',
						`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/study`
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
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
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
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
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
						BIBLE_TEXT_MARKUP_RESOURCE_TYPE
					]?.resourceId
				).toBe(
					`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/kjv`
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
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
								)
						})
					);

				expect(
					selections[
						BIBLE_TEXT_MARKUP_RESOURCE_TYPE
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
			tryGetPubkey() {
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
