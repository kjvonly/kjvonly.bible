import {
	newVerse,
	type Verse
} from '$lib/domains/bible/models/bible.model';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	ChapterService
} from './chapter.service';

import type {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

export class VerseService {

	constructor(
		private readonly chapterService:
			Pick<
				ChapterService,
				'get'
			>,

		private readonly bibleLocationReferenceService:
			Pick<
				BibleLocationReferenceService,
				'extractVerse'
			>
	) {}

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<Verse> {

		const chapter =
			await this.chapterService.get(
				source,
				bibleLocationRef
			);

		const verseNumber =
			this.bibleLocationReferenceService
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