import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	createBibleTextMarkupId
} from '$lib/domains/bible/models/bible-text-markup.model';

import type {
	BibleTextMarkupStore
} from '$lib/domains/bible/persistence/bible-text-markup-store';

import type {
	ResourceLoader
} from '$lib/resource/loading/resource-loader';

import type {
	BibleTextMarkupWriteTransaction
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-write-stores';

import type {
	BibleTextMarkupResourcePublication
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-publication';

import type {
	OutboxWakeup
} from '$lib/resource/outbox/outbox-wakeup';

import {
	parseBibleTextMarkupResourceSource
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-source';

import {
	bibleLocationReferenceService
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
			OutboxWakeup
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

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<BibleTextMarkup> {
		const {
			name
		} =
			parseBibleTextMarkupResourceSource(
				source
			);

		const chapterRef =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const textMarkupId =
			createBibleTextMarkupId(
				source.publisher,
				name,
				chapterRef
			);

		const existing =
			await this.textMarkup.get(
				textMarkupId
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
				chapterRef
			);

		if (!found) {
			return {
				id:
					textMarkupId,

				chapterRef,

				markings:
					{}
			};
		}

		const installed =
			await this.textMarkup.get(
				textMarkupId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Text Markup was not installed: ${textMarkupId}`
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
