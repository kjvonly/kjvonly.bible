import {
	Modules
} from '$lib/application';

import {
	buildRequiredResourceSelections,
	type ModuleResourceSelectionBuildContext,
	type ModuleResourceSelectionContributor,
	type ResourceSelections
} from '$lib/application';

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
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-interpreter';

import {
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs';

import {
	createDefaultBibleTextMarkupSelection
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-default-selection';

import {
	NOTES_RESOURCE_TYPE,
	createDefaultNotesSelection
} from '$lib/domains/notes';

const RESOURCE_TYPES = [
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	STRONGS_RESOURCE_TYPE,
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	NOTES_RESOURCE_TYPE
] as const;

export interface CurrentUserIdentityProvider {
	tryGetUserId():
		string |
		undefined;
}

export class BibleModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.BIBLE;

	constructor(
		private readonly currentUser:
			CurrentUserIdentityProvider
	) {}

	build(
		context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections {
		const selections =
			buildRequiredResourceSelections(
				RESOURCE_TYPES,
				context
			);

		if (context.restoring) {
			delete selections[
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE
			];
		}

		const publisher =
			this.currentUser
				.tryGetUserId();

		if (!publisher) {
			return selections;
		}

		if (
			selections[
				NOTES_RESOURCE_TYPE
			] === undefined
		) {
			selections[
				NOTES_RESOURCE_TYPE
			] =
				createDefaultNotesSelection(
					publisher
				);
		}

		if (
			selections[
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE
			] !== undefined
		) {
			return selections;
		}

		const chapterSource =
			selections[
				BIBLE_CHAPTER_RESOURCE_TYPE
			];

		if (!chapterSource) {
			return selections;
		}

		selections[
			BIBLE_TEXT_MARKUP_RESOURCE_TYPE
		] =
			createDefaultBibleTextMarkupSelection(
				publisher,
				chapterSource
			);

		return selections;
	}
}
