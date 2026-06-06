import { bookNamesByIDService } from '$lib/services/bibleMetadata/bookNamesByID.service';
import { shortBookNamesByIDService } from '../bibleMetadata/shortBookNamesByID.service';

class BibleLocationReferenceService {
	/**
	 * Reduces a reference chapter key to BookID.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractBookID(ref: string): string {
		let bcvw = ref.split('_');
		if (bcvw.length > 0) {
			ref = bcvw[0];
		}
		return ref;
	}

	/**
	 * Returns the bookName from the ref.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractBookName(ref: string): string {
		let bcvw = ref.split('_');
		if (bcvw.length > 0) {
			ref = bcvw[0];
			return bookNamesByIDService.get(this.extractBookID(ref));
		}
		return '';
	}

	/**
	 * Returns the bookName from the ref.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractShortBookName(ref: string): string {
		let bcvw = ref.split('_');
		if (bcvw.length > 0) {
			ref = bcvw[0];
			return shortBookNamesByIDService.get(this.extractBookID(ref));
		}
		return '';
	}

	/**
	 * Reduces a reference chapter key to BookID.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractChapter(ref: string): number {
		let bcvw = ref.split('_');
		if (bcvw.length > 1) {
			return parseInt(bcvw[1]);
		}
		return 1;
	}

	/**
	 *
	 * @param ref a cross reference i.e. 47/5/3
	 * @returns a bible location reference 47_5_3
	 */
	convertCrossRefToBibleLocationRef(ref: string): string {
		return ref.replaceAll('/', '_');
	}

	/**
	 * Reduces a reference chapter key to BookID_Chapter.
	 *
	 * @param ref any reference
	 * @returns
	 */
	extractBookIDChapter(ref: string): string {
		let bcvw = ref.split('_');
		if (bcvw.length > 2) {
			ref = `${bcvw[0]}_${bcvw[1]}`;
		}
		return ref;
	}

	extractVersesOrOne(ref: string): number[] {
		let bcv = ref.split('_');
		if (bcv.length > 2) {
			let verses = bcv[2].split('-');
			let s = parseInt(verses[0]);
			let e = parseInt(verses[1]);

			if (!Number.isNaN(s) && !Number.isNaN(e)) {
				return [s - 1, e];
			} else {
				return [0, 0];
			}
		}

		return [0, 0];
	}

	extractVerse(ref: string): number {
		let bcv = ref.split('_');
		if (bcv.length > 2) {
			return this.extractFirstVerse(bcv[2]);
		}
		return 1;
	}

	extractFirstVerse(verse: string) {
		if (verse.includes('-')) {
			verse = verse.split('-')[0];
		}
		return parseInt(verse, 10);
	}

	extractWordIndexOrDefault(
		bibleLocationRef: string,
		defaultWordIndex?: string | undefined
	): string {
		if (!defaultWordIndex) {
			defaultWordIndex = '0';
		}
		let refs = bibleLocationRef.split('_');
		if (refs.length === 4) {
			return refs[3];
		}

		return defaultWordIndex;
	}

	hasVerse(ref: string) {
		return ref.split('_').length > 2;
	}

	makeBibleLocationRef(
		bookID: string,
		chapter: number,
		verseNumber: number
	): string {
		return `${bookID}_${chapter}_${verseNumber}`;
	}
}

export const bibleLocationReferenceService =
	new BibleLocationReferenceService();
