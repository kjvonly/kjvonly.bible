import type { BibleLocationReferenceService } from './bibleLocationReference.service';

interface BibleNavigationBook {
	readonly bookID: string;
	readonly maxChapter: number;
}

export const books: readonly BibleNavigationBook[] = [
	{ bookID: '1', maxChapter: 50 },
	{ bookID: '2', maxChapter: 40 },
	{ bookID: '3', maxChapter: 27 },
	{ bookID: '4', maxChapter: 36 },
	{ bookID: '5', maxChapter: 34 },
	{ bookID: '6', maxChapter: 24 },
	{ bookID: '7', maxChapter: 21 },
	{ bookID: '8', maxChapter: 4 },
	{ bookID: '9', maxChapter: 31 },
	{ bookID: '10', maxChapter: 24 },
	{ bookID: '11', maxChapter: 22 },
	{ bookID: '12', maxChapter: 25 },
	{ bookID: '13', maxChapter: 29 },
	{ bookID: '14', maxChapter: 36 },
	{ bookID: '15', maxChapter: 10 },
	{ bookID: '16', maxChapter: 13 },
	{ bookID: '19', maxChapter: 10 },
	{ bookID: '22', maxChapter: 42 },
	{ bookID: '23', maxChapter: 150 },
	{ bookID: '24', maxChapter: 31 },
	{ bookID: '25', maxChapter: 12 },
	{ bookID: '26', maxChapter: 8 },
	{ bookID: '29', maxChapter: 66 },
	{ bookID: '30', maxChapter: 52 },
	{ bookID: '31', maxChapter: 5 },
	{ bookID: '33', maxChapter: 48 },
	{ bookID: '34', maxChapter: 12 },
	{ bookID: '35', maxChapter: 14 },
	{ bookID: '36', maxChapter: 3 },
	{ bookID: '37', maxChapter: 9 },
	{ bookID: '38', maxChapter: 1 },
	{ bookID: '39', maxChapter: 4 },
	{ bookID: '40', maxChapter: 7 },
	{ bookID: '41', maxChapter: 3 },
	{ bookID: '42', maxChapter: 3 },
	{ bookID: '43', maxChapter: 3 },
	{ bookID: '44', maxChapter: 2 },
	{ bookID: '45', maxChapter: 14 },
	{ bookID: '46', maxChapter: 4 },
	{ bookID: '47', maxChapter: 28 },
	{ bookID: '48', maxChapter: 16 },
	{ bookID: '49', maxChapter: 24 },
	{ bookID: '50', maxChapter: 21 },
	{ bookID: '51', maxChapter: 28 },
	{ bookID: '52', maxChapter: 16 },
	{ bookID: '53', maxChapter: 16 },
	{ bookID: '54', maxChapter: 13 },
	{ bookID: '55', maxChapter: 6 },
	{ bookID: '56', maxChapter: 6 },
	{ bookID: '57', maxChapter: 4 },
	{ bookID: '58', maxChapter: 4 },
	{ bookID: '59', maxChapter: 5 },
	{ bookID: '60', maxChapter: 3 },
	{ bookID: '61', maxChapter: 6 },
	{ bookID: '62', maxChapter: 4 },
	{ bookID: '63', maxChapter: 3 },
	{ bookID: '64', maxChapter: 1 },
	{ bookID: '65', maxChapter: 13 },
	{ bookID: '66', maxChapter: 5 },
	{ bookID: '67', maxChapter: 5 },
	{ bookID: '68', maxChapter: 3 },
	{ bookID: '69', maxChapter: 5 },
	{ bookID: '70', maxChapter: 1 },
	{ bookID: '71', maxChapter: 1 },
	{ bookID: '72', maxChapter: 1 },
	{ bookID: '73', maxChapter: 22 }
];

interface BibleNavigationChapter {
	readonly bookIndex: number;
	readonly book: BibleNavigationBook;
	readonly chapter: number;
}

export class BibleNavigationService {
	constructor(
		private readonly bibleLocationReferenceService: Pick<
			BibleLocationReferenceService,
			'extractBookIDChapter'
		>
	) {}

	next(bibleLocationRef: string): string {
		const { bookIndex, book, chapter } = this.requireChapter(bibleLocationRef);

		if (chapter < book.maxChapter) {
			return `${book.bookID}_${chapter + 1}`;
		}

		const nextBook = books[(bookIndex + 1) % books.length];

		return `${nextBook.bookID}_1`;
	}

	previous(bibleLocationRef: string): string {
		const { bookIndex, book, chapter } = this.requireChapter(bibleLocationRef);

		if (chapter > 1) {
			return `${book.bookID}_${chapter - 1}`;
		}

		const previousBook = books[(bookIndex - 1 + books.length) % books.length];

		return `${previousBook.bookID}_${previousBook.maxChapter}`;
	}

	private requireChapter(bibleLocationRef: string): BibleNavigationChapter {
		const chapterRef =
			this.bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);

		const [bookID, chapterValue] = chapterRef.split('_');

		const chapter = Number(chapterValue);

		const bookIndex = books.findIndex((book) => book.bookID === bookID);

		const book = books[bookIndex];

		if (
			!book ||
			!Number.isInteger(chapter) ||
			chapter < 1 ||
			chapter > book.maxChapter
		) {
			throw new Error(`Unknown Bible chapter: ${chapterRef}`);
		}

		return {
			bookIndex,
			book,
			chapter
		};
	}
}
