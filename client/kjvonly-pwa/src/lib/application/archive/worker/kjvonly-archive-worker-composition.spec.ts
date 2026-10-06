import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-booknames-store';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-search-index-store';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-text-markup-store';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/persistence/chapter-store';

import {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/persistence/notes-store';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-definitions-store';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-subscriptions-store';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createArchivePublicationResolver
} from './kjvonly-archive-worker-composition';

describe(
	'createArchivePublicationResolver',
	() => {
		it(
			'reconstructs every Resource-backed Domain Object type handled by the Resource processor',
			() => {
				const resolver =
					createArchivePublicationResolver();

				const cases = [
					{
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/1_1',
						value: {
							id:
								'publisher/kjvs/1_1',
							number: 1,
							bookName: 'Genesis',
							verses: {},
							verseMap: {},
							footnotes: {}
						},
						resourceType:
							'bible/chapter',
						resourceId:
							'kjvonly/bible/chapter/kjvs/1_1'
					},
					{
						objectType:
							BIBLE_BOOKNAMES_OBJECT_TYPE,
						objectId:
							'publisher/default',
						value: {
							id:
								'publisher/default',
							booknamesById: {},
							booknamesByName: {},
							shortNames: {},
							maxChapterById: {},
							bookchapterversecountById: {}
						},
						resourceType:
							'bible/booknames',
						resourceId:
							'kjvonly/bible/booknames/default'
					},
					{
						objectType:
							BIBLE_PARAGRAPHS_OBJECT_TYPE,
						objectId:
							'publisher/default/1_1',
						value: {
							id:
								'publisher/default/1_1',
							chapterRef: '1_1',
							paragraphs: {}
						},
						resourceType:
							'bible/paragraphs',
						resourceId:
							'kjvonly/bible/paragraphs/default/1_1'
					},
					{
						objectType:
							BIBLE_PERICOPES_OBJECT_TYPE,
						objectId:
							'publisher/default/1_1',
						value: {
							id:
								'publisher/default/1_1',
							chapterRef: '1_1',
							pericopes: {}
						},
						resourceType:
							'bible/pericopes',
						resourceId:
							'kjvonly/bible/pericopes/default/1_1'
					},
					{
						objectType:
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/1_1',
						value: {
							id:
								'publisher/kjvs/1_1',
							chapterRef: '1_1',
							markings: {}
						},
						resourceType:
							'bible/text-markup',
						resourceId:
							'kjvonly/bible/text-markup/kjvs/1_1'
					},
					{
						objectType:
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						objectId:
							'publisher/kjvs',
						value: {
							id:
								'publisher/kjvs',
							version: 'kjvs',
							chunks: {}
						},
						resourceType:
							'bible/search-index',
						resourceId:
							'kjvonly/bible/search-index/kjvs'
					},
					{
						objectType:
							NOTE_OBJECT_TYPE,
						objectId:
							'publisher/default/note-1',
						value: {
							id:
								'publisher/default/note-1',
							bibleLocationRef: undefined,
							bibleReferenceText: '',
							text: 'note',
							html: '<p>note</p>',
							title: 'Note',
							dateCreated: 1,
							dateUpdated: 1,
							tags: []
						},
						resourceType:
							'notes/note',
						resourceId:
							'kjvonly/notes/note/default/note-1'
					},
					{
						objectType:
							PLAN_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/default/plan-1',
						value: {
							id:
								'publisher/default/plan-1',
							name: 'Plan',
							description: '',
							encodedReadings: []
						},
						resourceType:
							'reading-plans/plan-definition',
						resourceId:
							'kjvonly/reading-plans/plan-definition/default/plan-1'
					},
					{
						objectType:
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
						objectId:
							'publisher/default/subscription-1',
						value: {
							id:
								'publisher/default/subscription-1',
							planDefinitionId:
								'other/default/plan-1',
							name: 'Plan',
							description: '',
							encodedReadings: [],
							dateSubscribed: 1
						},
						resourceType:
							'reading-plans/plan-subscription',
						resourceId:
							'kjvonly/reading-plans/plan-subscription/default/subscription-1'
					},
					{
						objectType:
							PLAN_PROGRESS_OBJECT_TYPE,
						objectId:
							'publisher/default/subscription-1',
						value: {
							id:
								'publisher/default/subscription-1',
							completedReadingIndexes: []
						},
						resourceType:
							'reading-plans/plan-progress',
						resourceId:
							'kjvonly/reading-plans/plan-progress/default/subscription-1'
					},
					{
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/kjvs/G1',
						value: {
							id:
								'publisher/kjvs/G1',
							number: 'G1',
							originalWord: '',
							partsOfSpeech: '',
							phoneticSpelling: '',
							transliteratedWord: '',
							usageByBook: [],
							usageByWord: [],
							brownDef: null,
							strongsDef: '',
							thayersDef: null
						},
						resourceType:
							'strongs/definition',
						resourceId:
							'kjvonly/strongs/definition/kjvs/G1'
					}
				] as const;

				for (
					const testCase of cases
				) {
					const publication =
						resolver.resolve(
							testCase.objectType,
							testCase.objectId,
							testCase.value
						);

					expect(
						publication,
						testCase.objectType
					).toMatchObject({
						publisher:
							'publisher',
						resourceType:
							testCase.resourceType,
						resourceId:
							testCase.resourceId,
						representation:
							'content'
					});
				}
			}
		);
	}
);
