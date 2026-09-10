import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceSelections
} from './resource-selections';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

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

import {
	ModuleResourceSelectionBuilder,
	type ResourceSelectionSnapshotProvider
} from './module-resource-selection-builder';

describe(
	'ModuleResourceSelectionBuilder',
	() => {
		it(
			'creates an independent module snapshot from current global selections',
			() => {
				const currentSelections = {
					[BIBLE_CHAPTER_RESOURCE_TYPE]:
						createReference(
							'global-chapters',
							`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
						),

					[BIBLE_PARAGRAPHS_RESOURCE_TYPE]:
						createReference(
							'global-paragraphs',
							`${BIBLE_PARAGRAPHS_RESOURCE_TYPE}/default`
						),

					[BIBLE_PERICOPES_RESOURCE_TYPE]:
						createReference(
							'global-pericopes',
							`${BIBLE_PERICOPES_RESOURCE_TYPE}/default`
						),

					[STRONGS_RESOURCE_TYPE]:
						createReference(
							'global-strongs',
							`${STRONGS_RESOURCE_TYPE}/kjvs`
						),

					[BIBLE_SEARCH_RESOURCE_TYPE]:
						createReference(
							'global-search',
							`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
						)
				};

				const builder =
					createBuilder(
						currentSelections
					);

				expect(
					builder.independent(
						Modules.BIBLE
					)
				).toEqual({
					[BIBLE_CHAPTER_RESOURCE_TYPE]:
						currentSelections[
							BIBLE_CHAPTER_RESOURCE_TYPE
						],

					[BIBLE_PARAGRAPHS_RESOURCE_TYPE]:
						currentSelections[
							BIBLE_PARAGRAPHS_RESOURCE_TYPE
						],

					[BIBLE_PERICOPES_RESOURCE_TYPE]:
						currentSelections[
							BIBLE_PERICOPES_RESOURCE_TYPE
						],

					[STRONGS_RESOURCE_TYPE]:
						currentSelections[
							STRONGS_RESOURCE_TYPE
						]
				});
			}
		);

		it(
			'does not copy Resource Types the target module does not require',
			() => {
				const builder =
					createBuilder({
						[BIBLE_CHAPTER_RESOURCE_TYPE]:
							createReference(
								'chapters',
								`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
							),

						[BIBLE_SEARCH_RESOURCE_TYPE]:
							createReference(
								'search',
								`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
							)
					});

				const selections =
					builder.independent(
						Modules.BIBLE
					);

				expect(
					selections[
						BIBLE_SEARCH_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);

		it(
			'prefers originating Buffer selections when creating a related module',
			() => {
				const globalChapter =
					createReference(
						'global-chapters',
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
					);

				const globalSearch =
					createReference(
						'global-search',
						`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
					);

				const originatingChapter =
					createReference(
						'origin-chapters',
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
					);

				const builder =
					createBuilder({
						[BIBLE_CHAPTER_RESOURCE_TYPE]:
							globalChapter,

						[BIBLE_SEARCH_RESOURCE_TYPE]:
							globalSearch
					});

				expect(
					builder.related(
						Modules.SEARCH,
						{
							[BIBLE_CHAPTER_RESOURCE_TYPE]:
								originatingChapter
						}
					)
				).toEqual({
					[BIBLE_SEARCH_RESOURCE_TYPE]:
						globalSearch,

					[BIBLE_CHAPTER_RESOURCE_TYPE]:
						originatingChapter
				});
			}
		);

		it(
			'uses the current global selection when the originating Buffer lacks a required Resource Type',
			() => {
				const globalSearch =
					createReference(
						'global-search',
						`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
					);

				const builder =
					createBuilder({
						[BIBLE_SEARCH_RESOURCE_TYPE]:
							globalSearch
					});

				expect(
					builder.related(
						Modules.SEARCH,
						{}
					)[
						BIBLE_SEARCH_RESOURCE_TYPE
					]
				).toEqual(
					globalSearch
				);
			}
		);

		it(
			'keeps a missing required selection missing when neither source contains it',
			() => {
				const builder =
					createBuilder({});

				const selections =
					builder.related(
						Modules.BIBLE,
						{}
					);

				expect(
					selections
				).toEqual({});
			}
		);

		it(
			'does not copy unrelated originating Buffer selections',
			() => {
				const originatingSearch =
					createReference(
						'origin-search',
						`${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
					);

				const builder =
					createBuilder({});

				const selections =
					builder.related(
						Modules.BIBLE,
						{
							[BIBLE_SEARCH_RESOURCE_TYPE]:
								originatingSearch
						}
					);

				expect(
					selections[
						BIBLE_SEARCH_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);

		it(
			'copies references into the module snapshot',
			() => {
				const chapter =
					createReference(
						'publisher',
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
					);

				const builder =
					createBuilder({
						[BIBLE_CHAPTER_RESOURCE_TYPE]:
							chapter
					});

				const selections =
					builder.independent(
						Modules.BIBLE
					);

				expect(
					selections[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).toEqual(
					chapter
				);

				expect(
					selections[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).not.toBe(
					chapter
				);
			}
		);

		it(
			'asks for a fresh global snapshot for each module creation',
			() => {
				const firstChapter =
					createReference(
						'publisher-a',
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
					);

				const secondChapter =
					createReference(
						'publisher-b',
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
					);

				let current =
					firstChapter;

				const provider:
					ResourceSelectionSnapshotProvider = {
						snapshot() {
							return {
								[BIBLE_CHAPTER_RESOURCE_TYPE]:
									current
							};
						}
					};

				const builder =
					new ModuleResourceSelectionBuilder(
						provider
					);

				const first =
					builder.independent(
						Modules.BIBLE
					);

				current =
					secondChapter;

				const second =
					builder.independent(
						Modules.BIBLE
					);

				expect(
					first[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).toEqual(
					firstChapter
				);

				expect(
					second[
						BIBLE_CHAPTER_RESOURCE_TYPE
					]
				).toEqual(
					secondChapter
				);
			}
		);
	}
);

function createBuilder(
	selections:
		ResourceSelections
): ModuleResourceSelectionBuilder {
	return new ModuleResourceSelectionBuilder({
		snapshot() {
			return {
				...selections
			};
		}
	});
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
