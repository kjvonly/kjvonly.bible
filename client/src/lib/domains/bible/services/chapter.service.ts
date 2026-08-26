import {
	newChapter,
	type Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterStore
} from '$lib/domains/bible/persistence/chapter-store';

import {
	bibleLocationReferenceService
} from './bibleLocationReference.service';

export class ChapterService {

	constructor(
		private readonly chapters:
			ChapterStore
	) {}

	async get(
		bibleVersionId: string,
		bibleLocationRef: string
	): Promise<Chapter> {
		const chapterRef =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const chapterId =
			`${bibleVersionId}/${chapterRef}`;

		const chapter =
			await this.chapters.get(
				chapterId
			);

		return (
			chapter ??
			newChapter()
		);
	}
}