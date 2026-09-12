import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import type {
	BibleParagraphsStore
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import type {
	ResourceLoader
} from '$lib/resource/loading/resource-loader';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-interpreter';

import {
	bibleLocationReferenceService
} from './bibleLocationReference.service';

export class ParagraphsService {

	constructor(
		private readonly paragraphs:
			Pick<
				BibleParagraphsStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>
	) {}

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<BibleParagraphs> {

		const {
			source: paragraphSource
		} =
			parseParagraphsSource(
				source
			);

		const chapterRef =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const paragraphsId =
			createBibleParagraphsId(
				source.publisher,
				paragraphSource,
				chapterRef
			);

		const existing =
			await this.paragraphs.get(
				paragraphsId
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
			throw new Error(
				`Bible Paragraphs Resource not found: ${source.publisher}/${source.resourceId}`
			);
		}

		const installed =
			await this.paragraphs.get(
				paragraphsId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Paragraphs were not installed: ${paragraphsId}`
			);
		}

		return installed;
	}
}

function parseParagraphsSource(
	source:
		PublishedResourceReference
): {
	readonly source:
		string;
} {

	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_PARAGRAPHS_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Paragraphs Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Paragraphs Resource source: ${source.resourceId}`
		);
	}

	return {
		source:
			identifier.path[0]
	};
}
