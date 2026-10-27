import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	BIBLE_SEARCH_RESOURCE_TYPE
} from '$lib/domains/bible';

import {
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

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
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {},
						currentSelections: {
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
							[BIBLE_SEARCH_RESOURCE_TYPE]:
								createReference(
									'search',
									`kjvonly/bible/search-index/kjvs`
								)
						}
					});

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE,
					NOTES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'derives the default Notes selection from the current user',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {},
						currentSelections: {}
					});

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
			'leaves Notes missing when no current user is available',
			() => {
				const selections =
					createContributor().build({
						originatingSelections: {},
						currentSelections: {}
					});

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
): NotesModuleResourceSelectionContributor {
	return new NotesModuleResourceSelectionContributor(
		{
			tryGetUserId() {
				return pubkey;
			}
		}
	);
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
