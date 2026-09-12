import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ModuleResourceSelectionBuildContext,
	ModuleResourceSelectionContributor
} from '$lib/application/resources/module-resource-selection-contributor';

import {
	buildRequiredResourceSelections
} from '$lib/application/resources/module-resource-selection-contributor';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

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
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
	createDefaultBibleTextMarkupSelection
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-default-selection';

const RESOURCE_TYPES = [
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	STRONGS_RESOURCE_TYPE,
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
] as const;

export interface CurrentUserPubkeyProvider {
	tryGetPubkey():
		string |
		undefined;
}

export class BibleModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.BIBLE;

	constructor(
		private readonly currentUser:
			CurrentUserPubkeyProvider
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

		const publisher =
			this.currentUser
				.tryGetPubkey();

		if (!publisher) {
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
