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
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible';

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

export interface CurrentUserIdentityProvider {
	tryGetUserId():
		string |
		undefined;
}

export class NotesModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.NOTES;

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

		if (
			selections[
				NOTES_RESOURCE_TYPE
			] !== undefined
		) {
			return selections;
		}

		const publisher =
			this.currentUser
				.tryGetUserId();

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
