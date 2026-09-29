import type {
	BCV
} from '../models/bible.model';

export type BibleChapterVerseCountLookup =
	Readonly<
		Record<
			string,
			Readonly<Record<string, number>>
		>
	>;

/**
 * Formats Bible references for compact UI display using selected Booknames
 * metadata to identify whole-chapter readings.
 */
export class BibleReferenceLabelService {
	/**
	 * Formats a BCV as `Book Chapter` for a whole-chapter reading and
	 * `Book Chapter:Verses` for a partial-chapter reading.
	 */
	format(
		bcv: Pick<
			BCV,
			'bookName' | 'bookID' | 'chapter' | 'verses'
		>,
		verseCountByBookChapter:
			BibleChapterVerseCountLookup,
		bookName = bcv.bookName
	): string {
		const maxVerse =
			verseCountByBookChapter[
				String(bcv.bookID)
			]?.[String(bcv.chapter)];

		if (
			this.isWholeChapter(
				bcv.verses,
				maxVerse
			)
		) {
			return `${bookName} ${bcv.chapter}`;
		}

		return `${bookName} ${bcv.chapter}:${bcv.verses}`;
	}

	private isWholeChapter(
		verses: string,
		maxVerse: number | undefined
	): boolean {
		if (maxVerse === undefined) {
			return false;
		}

		const match =
			/^(\d+)(?:-(\d+))?$/.exec(
				verses.trim()
			);

		if (!match) {
			return false;
		}

		const startVerse =
			Number(match[1]);
		const endVerse =
			Number(match[2] ?? match[1]);

		return (
			startVerse === 1 &&
			endVerse === maxVerse
		);
	}
}
