import {
	describe,
	expect,
	it
} from 'vitest';

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

import {
	getModuleResourceRequirements
} from './module-resource-requirements';

describe(
	'getModuleResourceRequirements',
	() => {
		it(
			'declares the Resource Types required by the Bible module',
			() => {
				expect(
					getModuleResourceRequirements(
						Modules.BIBLE
					)
				).toEqual([
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_PARAGRAPHS_RESOURCE_TYPE,
					BIBLE_PERICOPES_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE,
					STRONGS_RESOURCE_TYPE
				]);
			}
		);

		it(
			'declares the Resource Types required by the Search module',
			() => {
				expect(
					getModuleResourceRequirements(
						Modules.SEARCH
					)
				).toEqual([
					BIBLE_SEARCH_RESOURCE_TYPE,
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'declares the Resource Types required by the Strong\'s module',
			() => {
				expect(
					getModuleResourceRequirements(
						Modules.STRONGS
					)
				).toEqual([
					STRONGS_RESOURCE_TYPE,
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_SEARCH_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'declares the Resource Types required by the Notes module',
			() => {
				expect(
					getModuleResourceRequirements(
						Modules.NOTES
					)
				).toEqual([
					BIBLE_CHAPTER_RESOURCE_TYPE,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'declares the Resource Types required by the Plans module',
			() => {
				expect(
					getModuleResourceRequirements(
						Modules.PLANS
					)
				).toEqual([
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				]);
			}
		);

		it(
			'returns no requirements for modules that do not currently consume selectable Resources',
			() => {
				for (
					const module of [
						Modules.MODULES,
						Modules.USER_GUIDE,
						Modules.LOGIN,
						Modules.SETTINGS,
						Modules.NULL,
						Modules.PROFILE
					]
				) {
					expect(
						getModuleResourceRequirements(
							module
						)
					).toEqual([]);
				}
			}
		);

		it(
			'returns a copy rather than exposing the stored requirement list',
			() => {
				const first =
					getModuleResourceRequirements(
						Modules.BIBLE
					);

				const second =
					getModuleResourceRequirements(
						Modules.BIBLE
					);

				expect(
					first
				).not.toBe(
					second
				);

				expect(
					first
				).toEqual(
					second
				);
			}
		);
	}
);
