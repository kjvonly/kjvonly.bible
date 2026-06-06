import { newVerse, type Verse } from '$lib/models/bible.model';
import { bibleLocationReferenceService } from './bibleLocationReference.service';
import { chapterService } from './chapter.service';

class VerseService {
	async get(bibleLocationRef: string): Promise<Verse> {
		let chapter = await chapterService.get(bibleLocationRef);
		let verseNumber =
			bibleLocationReferenceService.extractVerse(bibleLocationRef);
		let verse = chapter.verses[`${verseNumber}`];
		return verse || newVerse();
	}
}

export const verseService = new VerseService();
