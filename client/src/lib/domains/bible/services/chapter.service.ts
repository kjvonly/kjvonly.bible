import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterStore
} from '$lib/domains/bible/persistence/chapter-store';

import type {
	ChapterResourceLoader
} from './chapter-resource-loader';

import {
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	bibleLocationReferenceService
} from './bibleLocationReference.service';

export class ChapterService {

	constructor(
		private readonly publisher:
			string,

		private readonly chapters:
			Pick<
				ChapterStore,
				'get'
			>,

		private readonly resourceLoader:
			ChapterResourceLoader
	) {}

	async get(
		version: string,
		bibleLocationRef: string
	): Promise<Chapter> {
		const chapterRef =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const chapterId =
			createChapterId(
				this.publisher,
				version,
				chapterRef
			);

		const existing =
			await this.chapters.get(
				chapterId
			);

		if (existing) {
			return existing;
		}

		const found =
			await this.resourceLoader.load(
				this.publisher,
				version,
				chapterRef
			);

		if (!found) {
			throw new Error(
				`Bible Chapter Resource not found: ${this.publisher}/${version}/${chapterRef}`
			);
		}

		const installed =
			await this.chapters.get(
				chapterId
			);

		if (!installed) {
			throw new Error(
				`Bible Chapter was not installed: ${chapterId}`
			);
		}

		return installed;
	}
}