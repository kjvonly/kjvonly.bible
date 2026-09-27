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

export const BIBLE_NAVIGATION_RESULTS = {
	MENU_ACTION: 'bible.menu-action'
} as const;

export const BIBLE_MENU_ACTIONS = {
	COPY_VERSES: 'copy-verses',
	BIBLE_VERSION: 'bible-version',
	SEARCH: 'search',
	NOTES: 'notes',
	SPLIT_VERTICAL: 'split-vertical',
	SPLIT_HORIZONTAL: 'split-horizontal',
	CLOSE: 'close'
} as const;

export type BibleMenuAction =
	typeof BIBLE_MENU_ACTIONS[
		keyof typeof BIBLE_MENU_ACTIONS
	];
