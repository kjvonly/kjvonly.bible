import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	PlansModuleResourceSelectionContributor
} from './plans-module-resource-selection-contributor';

describe(
	'PlansModuleResourceSelectionContributor',
	() => {
		it(
			'owns the Plans module Resource requirements',
			() => {
				const selections =
					new PlansModuleResourceSelectionContributor()
						.build({
							originatingSelections: {},
							currentSelections: {
								[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
									createReference(
										'booknames',
										`${BIBLE_BOOKNAMES_RESOURCE_TYPE}/default`
									),
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									createReference(
										'chapters',
										`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
									)
							}
						});

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);
	}
);

function createReference(
	publisher: string,
	resourceId: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId
	};
}
