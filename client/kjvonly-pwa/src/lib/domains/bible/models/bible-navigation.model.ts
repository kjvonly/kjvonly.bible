export const BIBLE_VIEWS = {
	READER: 'bible.reader'
} as const;

export type BibleView =
	typeof BIBLE_VIEWS[
		keyof typeof BIBLE_VIEWS
	];
