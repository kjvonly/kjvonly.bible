import {
	type PublishedResourceReference,
	type ResourceLoader
} from '$lib/resource';

import type {
	BibleTextMarkup
} from '../models/bible-text-markup.model';

import {
	createBibleTextMarkupId
} from '../models/bible-text-markup.model';

import type {
	BibleTextMarkupStore
} from '../persistence/bible-text-markup-store';


import type {
	BibleTextMarkupWriteTransaction
} from '../resources/text-markup/bible-text-markup-write-stores';

import type {
	BibleTextMarkupResourcePublication
} from '../resources/text-markup/bible-text-markup-resource-publication';

import type {
	OutboxWakeup
} from '$lib/application';

import {
	parseBibleTextMarkupResourceSource
} from '../resources/text-markup/bible-text-markup-resource-source';

import type {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

type BibleTextMarkupSubscriber = {
	readonly subscriberId:
		string;

	readonly textMarkupId:
		string;

	readonly onChange:
		(
			textMarkup:
				BibleTextMarkup
		) => void;
};

export class BibleTextMarkupService {

	private subscribers:
		BibleTextMarkupSubscriber[] =
			[];

	constructor(
		private readonly textMarkup:
			Pick<
				BibleTextMarkupStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>,

		private readonly writeTransaction:
			BibleTextMarkupWriteTransaction,

		private readonly resourcePublication:
			Pick<
				BibleTextMarkupResourcePublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup,

		private readonly bibleLocationReferenceService:
			Pick<
				BibleLocationReferenceService,
				'extractBookIDChapter'
			>
	) {}

	async put(
		textMarkup:
			BibleTextMarkup
	): Promise<void> {
		const publication =
			this.resourcePublication
				.create(
					textMarkup
				);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores
					.textMarkup
					.put(
						textMarkup
					);

				await stores
					.outbox
					.put(
						textMarkup.id,
						publication
					);
			}
		);

		this.notify(
			textMarkup
		);

		this.outbox.wake();
	}

	subscribe(
		subscriberId: string,
		textMarkupId: string,
		onChange:
			(
				textMarkup:
					BibleTextMarkup
			) => void
	): void {
		this.unsubscribe(
			subscriberId
		);

		this.subscribers.push({
			subscriberId,
			textMarkupId,
			onChange
		});
	}

	unsubscribe(
		subscriberId: string
	): void {
		this.subscribers =
			this.subscribers.filter(
				(subscriber) =>
					subscriber.subscriberId !==
					subscriberId
			);
	}

	async refresh(): Promise<void> {
		const textMarkupIds =
			new Set(
				this.subscribers.map(
					(subscriber) =>
						subscriber.textMarkupId
				)
			);

		for (
			const textMarkupId of
			textMarkupIds
		) {
			const textMarkup =
				await this.textMarkup.get(
					textMarkupId
				);

			if (
				textMarkup ===
				undefined
			) {
				continue;
			}

			this.notify(
				textMarkup
			);
		}
	}

	/**
	 * Creates the valid empty Text Markup object for a selected Resource and
	 * Bible location. This gives the reader a stable Domain Object identity
	 * before any asynchronous Resource loading completes.
	 */
	create(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): BibleTextMarkup {
		const {
			name
		} =
			parseBibleTextMarkupResourceSource(
				source
			);

		const chapterRef =
			this.bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		return {
			id:
				createBibleTextMarkupId(
					source.publisher,
					name,
					chapterRef
				),

			chapterRef,

			markings:
				{}
		};
	}

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<BibleTextMarkup> {
		const empty =
			this.create(
				source,
				bibleLocationRef
			);

		const existing =
			await this.textMarkup.get(
				empty.id
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		const found =
			await this.resourceLoader.load(
				source,
				empty.chapterRef
			);

		if (!found) {
			return empty;
		}

		const installed =
			await this.textMarkup.get(
				empty.id
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Text Markup was not installed: ${empty.id}`
			);
		}

		return installed;
	}

	private notify(
		textMarkup:
			BibleTextMarkup
	): void {
		for (
			const subscriber of
			this.subscribers
		) {
			if (
				subscriber.textMarkupId !==
				textMarkup.id
			) {
				continue;
			}

			subscriber.onChange(
				textMarkup
			);
		}
	}
}
