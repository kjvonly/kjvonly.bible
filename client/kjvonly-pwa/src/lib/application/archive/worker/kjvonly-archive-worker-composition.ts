import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-text-markup-store';

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
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-subscriptions-store';

import {
	PlanProgressResourcePublication
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-publication';

import {
	PlanSubscriptionResourcePublication
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-resource-publication';

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

function createArchivePublicationResolver():
	ResourcePublicationResolver {
	const notes =
		new NotesResourcePublication();

	const textMarkup =
		new BibleTextMarkupResourcePublication();

	const planSubscriptions =
		new PlanSubscriptionResourcePublication();

	const planProgress =
		new PlanProgressResourcePublication();

	return new ResourcePublicationResolver([
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
		}
	]);
}
