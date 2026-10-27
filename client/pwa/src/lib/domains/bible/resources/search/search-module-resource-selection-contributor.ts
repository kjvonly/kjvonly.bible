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
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-resource';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '../chapters/bible-chapter-resource';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '../booknames/bible-booknames-resource';


const RESOURCE_TYPES = [
	BIBLE_SEARCH_RESOURCE_TYPE,
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
] as const;

export class SearchModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.SEARCH;

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
