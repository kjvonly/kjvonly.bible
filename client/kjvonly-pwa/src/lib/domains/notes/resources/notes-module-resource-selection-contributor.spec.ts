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
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

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
						`${NOTES_RESOURCE_TYPE}/default`
				});
			}
		);

		it(
			'preserves an existing Notes selection',
			() => {
				const selectedNotes =
					createReference(
						'other-publisher',
						`${NOTES_RESOURCE_TYPE}/study`
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
			tryGetPubkey() {
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
