import {
	newVerse,
	type Verse
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterService
} from './chapter.service';

import {
	bibleLocationReferenceService
} from './bibleLocationReference.service';

export class VerseService {

	constructor(
		private readonly chapterService:
			Pick<
				ChapterService,
				'get'
			>
	) {}

	async get(
		bibleVersion: string,
		bibleLocationRef: string
	): Promise<Verse> {
		const chapter =
			await this.chapterService.get(
				bibleVersion,
				bibleLocationRef
			);

		const verseNumber =
			bibleLocationReferenceService
				.extractVerse(
					bibleLocationRef
				);

		return (
			chapter.verses[
				`${verseNumber}`
			] ??
			newVerse()
		);
	}
}