export const BIBLE_VIEWS = {
	READER: 'bible.reader',
	MENU: 'bible.menu',
	VERSION: 'bible.version',
	BOOK_CHAPTER_VERSE: 'bible.book-chapter-verse',
	COPY_VERSE: 'bible.copy-verse',
	NAV_READINGS: 'bible.nav-readings'
} as const;

export type BibleView =
	typeof BIBLE_VIEWS[
		keyof typeof BIBLE_VIEWS
	];
