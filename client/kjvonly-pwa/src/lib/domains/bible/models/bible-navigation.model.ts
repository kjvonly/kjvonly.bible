export const BIBLE_VIEWS = {
	READER: 'bible.reader',
	OVERFLOW_ACTIONS: 'bible.overflow-actions',
	VERSION: 'bible.version',
	BOOK_CHAPTER_VERSE_BOOK: 'bible.book-chapter-verse.book',
	BOOK_CHAPTER_VERSE_CHAPTER: 'bible.book-chapter-verse.chapter',
	BOOK_CHAPTER_VERSE_VERSE: 'bible.book-chapter-verse.verse',
	BOOK_CHAPTER_VERSE: 'bible.book-chapter-verse',
	COPY_VERSE: 'bible.copy-verse',
	NAV_READINGS: 'bible.nav-readings'
} as const;

export type BibleView =
	typeof BIBLE_VIEWS[
		keyof typeof BIBLE_VIEWS
	];

export const BIBLE_NAVIGATION_RESULTS = {
	MENU_ACTION: 'bible.menu-action'
} as const;

export const BIBLE_MENU_ACTIONS = {
	COPY_VERSES: 'copy-verses',
	BIBLE_VERSION: 'bible-version',
	SPLIT_VERTICAL: 'split-vertical',
	SPLIT_HORIZONTAL: 'split-horizontal'
} as const;

export type BibleMenuAction =
	typeof BIBLE_MENU_ACTIONS[
		keyof typeof BIBLE_MENU_ACTIONS
	];
