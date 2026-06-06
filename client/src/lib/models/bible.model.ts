import type { NavReadings } from './plans.model';

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

export function jsonToChapter(data: any): Chapter {
  let result: Chapter = {
    id: data.id,
    number: data.number,
    bookName: data.bookName,
    verses: data.verses,
    verseMap: data.verseMap,
    footnotes: data.footnotes
  };

  return result;
}

export interface Chapter {
  id: string;
  number: number;
  bookName: string;
  verses: { [verseNumber: string]: Verse };
  verseMap: { [verseNumber: string]: string };
  footnotes: { [key: string]: string };
}

export function newChapter(): Chapter {
  return {
    id: '',
    number: 0,
    bookName: '',
    verses: {},
    verseMap: {},
    footnotes: {}
  };
}

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

export interface WordAnnots {
  class: string[];
}

export interface Annotations {
  id: string;
  version: number;
  annots: Annots;
}

export type Annots = { [verse: number]: { [wordIdx: number]: WordAnnots } };

export function newAnnotation(): Annotations {
  return {
    id: '',
    version: 0,
    annots: {}
  };
}

export interface BibleMode {
  value: BIBLE_MODES;
  navReadings: NavReadings | undefined;

  bibleLocationRef: string;
  notePopup: NotePopup;

  // edit options, word
  colorAnnotation: string;
  type: string;
}

export interface NotePopup {
  bibleLocationRef: string;
  show: boolean;
}

export function newBibleMode(): BibleMode {
  return {
    value: BIBLE_MODES.READING,
    navReadings: undefined,
    colorAnnotation: 'bg-highlighta',
    type: '',
    bibleLocationRef: '73_1_1_1',
    notePopup: {
      show: false,
      bibleLocationRef: '73_1_1_1'
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


export type Paragraphs = {}

export function newParagraphs(): Paragraphs {
  return {}
}

export type Pericopes = {}

export function newPericopes(): Pericopes {
  return {}
}
