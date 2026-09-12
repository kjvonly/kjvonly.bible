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
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

import {
	createDefaultNotesSelection
} from './notes-default-selection';

const RESOURCE_TYPES = [
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	NOTES_RESOURCE_TYPE
] as const;

export interface CurrentUserPubkeyProvider {
	tryGetPubkey():
		string |
		undefined;
}

export class NotesModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.NOTES;

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
				NOTES_RESOURCE_TYPE
			] !== undefined
		) {
			return selections;
		}

		const publisher =
			this.currentUser
				.tryGetPubkey();

		if (!publisher) {
			return selections;
		}

		selections[
			NOTES_RESOURCE_TYPE
		] =
			createDefaultNotesSelection(
				publisher
			);

		return selections;
	}
}
