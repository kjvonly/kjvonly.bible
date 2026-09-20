/**
 *
 * BCV is an abbreviation for Book, Chapter, Verse[s]. BCV contains metadata
 * associated to the Book Chapter verse.
 *
 * @example
 * let bcv: BCV {
 *      bookName: "Genesis",
 *      bookID: 1,
 *      chapter: 1,
 *      verses: "1-31",
 *      bibleLocationRef: "1_1_1-31"
 * }
 */
export interface BCV {
  bookName: string;
  bookID: number;
  chapter: number;
  verses: string;
  bibleLocationRef: string;
}

export interface Chapter {
  id: string;
  number: number;
  bookName: string;
  verses: { [verseNumber: string]: Verse };
  verseMap: { [verseNumber: string]: string };
  footnotes: { [key: string]: string };
}

export type ChapterContent =
	Omit<
		Chapter,
		'id'
	>;

export interface Verse {
  number: number;
  words: Word[];
  text: string;
}

export function newVerse(): Verse {
  return {
    number: 0,
    words: [],
    text: ''
  };
}

export interface Word {
  text: string;
  class: string[] | null;
  href: string[] | null;
  emphasis: boolean;
}

export interface BibleReadingNavigation {
  readings: {
    bcvs: BCV[];
  };
  currentNavReadingsIndex: number;
}

export interface BibleMode {
  paneID: string;

  value: BIBLE_MODES;
  navReadings: BibleReadingNavigation | undefined;

  bibleLocationRef: string;
  bibleVersion: string;

  notePopup: NotePopup;

  // edit options, word
  colorMarkup: string;
  type: string;
}

export interface NotePopup {
  bibleLocationRef: string;
  bibleVersion: string;
  show: boolean;
}

export function newBibleMode(): BibleMode {
  return {
    paneID: '',
    value: BIBLE_MODES.READING,
    navReadings: undefined,
    colorMarkup: 'bg-highlighta',
    type: '',
    bibleLocationRef: '73_1_1_1',
    bibleVersion: 'kjvs',
    notePopup: {
      show: false,
      bibleLocationRef: '73_1_1_1',
      bibleVersion: 'kjvs'
    }
  };
}

export enum BIBLE_MODES {
  READING = 1,
  EDIT
}

export enum ToolbarItems {
  BOOK_CHAPTER_VERSE = 1,
  Close,
  Copy,
  MENU,
  EDIT,
  SEARCH,
  SETTINGS
}

export interface BookGrouping {
  name: string;
  group: string;
}

export interface Book {
  id: string;
  name: string;
}

export interface CrossRef {
  bookId: string;
  bookName: string;
  chapterNumber: number;
  crossRef: string;
  bibleLocationRef: string;
  text: string;
  verseNumber: number;
}

export function newCrossRef(): CrossRef {
  return {
    bookId: '',
    bookName: '',
    chapterNumber: 0,
    crossRef: '',
    bibleLocationRef: '',
    text: '',
    verseNumber: 0
  };
}
