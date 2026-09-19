import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

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
	BibleBooknamesResourcePublication
} from '$lib/domains/bible/resources/booknames/bible-booknames-resource-publication';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	BibleChapterResourcePublication
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-publication';

import {
	BibleParagraphsResourcePublication
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-resource-publication';

import {
	BiblePericopesResourcePublication
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-resource-publication';

import {
	BibleSearchIndexResourcePublication
} from '$lib/domains/bible/resources/search/bible-search-index-resource-publication';

import {
	BibleTextMarkupResourcePublication
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-publication';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/persistence/notes-store';

import {
	NotesResourcePublication
} from '$lib/domains/notes/resources/notes-resource-publication';

import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

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
	PlanDefinitionResourcePublication
} from '$lib/domains/reading-plans/resources/definitions/plan-definition-resource-publication';

import {
	PlanProgressResourcePublication
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-publication';

import {
	PlanSubscriptionResourcePublication
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-resource-publication';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	StrongsResourcePublication
} from '$lib/domains/strongs/resources/definitions/strongs-resource-publication';

import {
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	ResourcePublicationResolver
} from '$lib/resource';

import {
	createContentResourceProcessor
} from '$lib/resource/worker/resource-worker-composition';

import {
	KJVOnlyArchiveCodec
} from '../kjvonly-archive-codec';

import {
	KJVOnlyArchiveExporter
} from '../kjvonly-archive-exporter';

import {
	KJVOnlyArchiveImporter,
	type KJVOnlyArchiveImportResult
} from '../kjvonly-archive-importer';

export interface KJVOnlyArchiveWorkerOperations {
	import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult>;

	export(
		objectTypes:
			readonly string[]
	): Promise<Uint8Array>;
}

export function createKJVOnlyArchiveWorkerOperations():
	KJVOnlyArchiveWorkerOperations {
	const codec =
		new KJVOnlyArchiveCodec();

	const exporter =
		new KJVOnlyArchiveExporter(
			getApplicationDB
		);

	const importer =
		new KJVOnlyArchiveImporter(
			getApplicationDB,
			createArchivePublicationResolver(),
			createContentResourceProcessor(),
			codec
		);

	return {
		import:
			(value) =>
				importer.import(
					value
				),

		export:
			async (
				objectTypes
			) => {
				const archive =
					await exporter.export({
						objectTypes:
							new Set(
								objectTypes
							)
					});

				return codec.encode(
					archive
				);
			}
	};
}

export function createArchivePublicationResolver():
	ResourcePublicationResolver {
	const bibleChapters =
		new BibleChapterResourcePublication();

	const bibleBooknames =
		new BibleBooknamesResourcePublication();

	const bibleParagraphs =
		new BibleParagraphsResourcePublication();

	const biblePericopes =
		new BiblePericopesResourcePublication();

	const bibleSearchIndexes =
		new BibleSearchIndexResourcePublication();

	const textMarkup =
		new BibleTextMarkupResourcePublication();

	const notes =
		new NotesResourcePublication();

	const planDefinitions =
		new PlanDefinitionResourcePublication();

	const planSubscriptions =
		new PlanSubscriptionResourcePublication();

	const planProgress =
		new PlanProgressResourcePublication();

	const strongs =
		new StrongsResourcePublication();

	return new ResourcePublicationResolver([
		{
			objectType:
				BIBLE_CHAPTER_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					bibleChapters.create({
						...value as Chapter,
						id:
							objectId
					})
		},
		{
			objectType:
				BIBLE_BOOKNAMES_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					bibleBooknames.create({
						...value as BibleBooknames,
						id:
							objectId
					})
		},
		{
			objectType:
				BIBLE_PARAGRAPHS_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					bibleParagraphs.create({
						...value as BibleParagraphs,
						id:
							objectId
					})
		},
		{
			objectType:
				BIBLE_PERICOPES_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					biblePericopes.create({
						...value as BiblePericopes,
						id:
							objectId
					})
		},
		{
			objectType:
				BIBLE_TEXT_MARKUP_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					textMarkup.create({
						...value as BibleTextMarkup,
						id:
							objectId
					})
		},
		{
			objectType:
				BIBLE_SEARCH_INDEX_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					bibleSearchIndexes.create({
						...value as BibleSearchIndex,
						id:
							objectId
					})
		},
		{
			objectType:
				NOTE_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					notes.create({
						...value as Note,
						id:
							objectId
					})
		},
		{
			objectType:
				PLAN_DEFINITION_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					planDefinitions.create({
						...value as PlanDefinition,
						id:
							objectId
					})
		},
		{
			objectType:
				PLAN_SUBSCRIPTION_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					planSubscriptions.create({
						...value as PlanSubscription,
						id:
							objectId
					})
		},
		{
			objectType:
				PLAN_PROGRESS_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					planProgress.create({
						...value as PlanProgress,
						id:
							objectId
					})
		},
		{
			objectType:
				STRONGS_DEFINITION_OBJECT_TYPE,

			create:
				(
					objectId,
					value
				) =>
					strongs.create({
						...value as Strongs,
						id:
							objectId
					})
		}
	]);
}
