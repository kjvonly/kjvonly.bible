import {
	Modules
} from '$lib/application/models/modules.model';

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
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

const MODULE_RESOURCE_REQUIREMENTS:
	Partial<
		Record<
			Modules,
			readonly string[]
		>
	> = {
	[Modules.BIBLE]: [
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_PARAGRAPHS_RESOURCE_TYPE,
		BIBLE_PERICOPES_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE,
		STRONGS_RESOURCE_TYPE
	],

	[Modules.SEARCH]: [
		BIBLE_SEARCH_RESOURCE_TYPE,
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	],

	[Modules.STRONGS]: [
		STRONGS_RESOURCE_TYPE,
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_SEARCH_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	],

	[Modules.NOTES]: [
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	],

	[Modules.PLANS]: [
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	]
};

export function getModuleResourceRequirements(
	module: Modules
): readonly string[] {
	return [
		...(
			MODULE_RESOURCE_REQUIREMENTS[
				module
			] ??
			[]
		)
	];
}
