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
	BIBLE_SEARCH_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible';

import {
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

const RESOURCE_TYPES = [
	STRONGS_RESOURCE_TYPE,
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_SEARCH_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
] as const;

export class StrongsModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.STRONGS;

	build(
		context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections {
		return buildRequiredResourceSelections(
			RESOURCE_TYPES,
			context
		);
	}
}
