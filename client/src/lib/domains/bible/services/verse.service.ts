import {
	newVerse,
	type Verse
} from '$lib/domains/bible/models/bible.model';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

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