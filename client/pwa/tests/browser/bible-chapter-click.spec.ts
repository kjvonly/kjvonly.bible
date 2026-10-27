import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_CHAPTER_CLICK_INTENTS,
	bibleChapterClick,
	type BibleChapterClickIntent,
	type BibleChapterClickTarget
} from '../../src/lib/domains/bible/modules/reader/chapter/interactions/bible-chapter-click';

function createBibleToken(
	verseNumber: number,
	wordIndex: number
): {
	root: HTMLDivElement;
	child: HTMLSpanElement;
} {
	const root = document.createElement('div');
	const target = document.createElement('span');
	const child = document.createElement('span');

	target.dataset.bibleWord = '';
	target.dataset.verse = String(verseNumber);
	target.dataset.wordIndex = String(wordIndex);
	target.appendChild(child);
	root.appendChild(target);
	document.body.appendChild(root);

	return {
		root,
		child
	};
}

function createBibleNote(
	verseNumber: number,
	wordIndex: number
): {
	root: HTMLDivElement;
	button: HTMLButtonElement;
} {
	const root = document.createElement('div');
	const button = document.createElement('button');

	button.dataset.bibleNote = '';
	button.dataset.verse = String(verseNumber);
	button.dataset.wordIndex = String(wordIndex);
	root.appendChild(button);
	document.body.appendChild(root);

	return {
		root,
		button
	};
}

function createBibleBookmark(
    verseNumber: number,
    wordIndex: number
): { root: HTMLDivElement; button: HTMLButtonElement } {
    const root = document.createElement('div');
    const button = document.createElement('button');
    button.dataset.bibleBookmark = '';
    button.dataset.verse = String(verseNumber);
    button.dataset.wordIndex = String(wordIndex);
    root.appendChild(button);
    document.body.appendChild(root);
    return { root, button };
}

function createParameters(
	intent: BibleChapterClickIntent
) {
	return {
		intent,
		onReadingActivate: (_target: BibleChapterClickTarget) => false,
		onTextMarkupToggle: (_target: BibleChapterClickTarget) => {},
		onNoteLocationSelect: (_target: BibleChapterClickTarget) => {},
		onBookmarkLocationSelect: (_target: BibleChapterClickTarget) => {},
		onBookmarkRelocationLocationSelect: (_target: BibleChapterClickTarget) => {},
		onOpenNote: (_target: BibleChapterClickTarget) => {},
		onOpenBookmark: (_target: BibleChapterClickTarget) => {}
	};
}

describe(
	'bibleChapterClick',
	() => {
		it(
			'allows unhandled reading tokens to continue normally',
			() => {
				const { root, child } =
					createBibleToken(3, 7);
				let childClicks = 0;
				child.addEventListener(
					'click',
					() => {
						childClicks += 1;
					}
				);

				const action = bibleChapterClick(
					root,
					createParameters(
						BIBLE_CHAPTER_CLICK_INTENTS.READING
					)
				);

				try {
					child.click();
					expect(childClicks).toBe(1);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it(
			'consumes handled reading tokens resolved through closest',
			() => {
				const { root, child } =
					createBibleToken(3, 7);
				let selected: BibleChapterClickTarget | undefined;
				let childClicks = 0;
				child.addEventListener(
					'click',
					() => {
						childClicks += 1;
					}
				);
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.READING
				);
				parameters.onReadingActivate = (target) => {
					selected = target;
					return true;
				};

				const action = bibleChapterClick(
					root,
					parameters
				);

				try {
					child.click();

					expect(selected).toEqual({
						verseNumber: 3,
						wordIndex: 7
					});
					expect(childClicks).toBe(0);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it(
			'routes edit clicks to Text Markup including verse number zero',
			() => {
				const { root, child } =
					createBibleToken(16, 0);
				let selected: BibleChapterClickTarget | undefined;
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.TEXT_MARKUP
				);
				parameters.onTextMarkupToggle = (target) => {
					selected = target;
				};

				const action = bibleChapterClick(
					root,
					parameters
				);

				try {
					child.click();

					expect(selected).toEqual({
						verseNumber: 16,
						wordIndex: 0
					});
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it(
			'routes Note-location intent exclusively to Bible tokens',
			() => {
				const { root, child } =
					createBibleToken(16, 7);
				let selected: BibleChapterClickTarget | undefined;
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.NOTE_LOCATION
				);
				parameters.onNoteLocationSelect = (target) => {
					selected = target;
				};

				const action = bibleChapterClick(
					root,
					parameters
				);

				try {
					child.click();

					expect(selected).toEqual({
						verseNumber: 16,
						wordIndex: 7
					});
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it.each([
			{ wordIndex: 0, description: 'verse-number token' },
			{ wordIndex: 7, description: 'exact word token' }
		])(
			'routes Bookmark-location selection on $description exclusively',
			({ wordIndex }) => {
				const { root, child } = createBibleToken(16, wordIndex);
				let selected: BibleChapterClickTarget | undefined;
				let noteSelections = 0;
				let markupToggles = 0;
				let tokenClicks = 0;
				child.addEventListener('click', () => tokenClicks++);
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_LOCATION
				);
				parameters.onBookmarkLocationSelect = (target) => {
					selected = target;
				};
				parameters.onNoteLocationSelect = () => noteSelections++;
				parameters.onTextMarkupToggle = () => markupToggles++;
				const action = bibleChapterClick(root, parameters);
				try {
					child.click();
					expect(selected).toEqual({ verseNumber: 16, wordIndex });
					expect(noteSelections).toBe(0);
					expect(markupToggles).toBe(0);
					expect(tokenClicks).toBe(0);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it.each([0, 7])(
			'routes Bookmark relocation destination for word index %s without invoking Add',
			(wordIndex) => {
				const { root, child } = createBibleToken(16, wordIndex);
				let destination: BibleChapterClickTarget | undefined;
				let addCalled = false;
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_RELOCATION_LOCATION
				);
				parameters.onBookmarkLocationSelect = () => addCalled = true;
				parameters.onBookmarkRelocationLocationSelect = (target) => destination = target;
				const action = bibleChapterClick(root, parameters);
				try {
					child.click();
					expect(destination).toEqual({ verseNumber: 16, wordIndex });
					expect(addCalled).toBe(false);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it(
			'blocks inline Note affordances during Bookmark-location selection',
			() => {
				const { root, button } = createBibleNote(16, 7);
				let opened = false;
				let selected = false;
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_LOCATION
				);
				parameters.onOpenNote = () => opened = true;
				parameters.onBookmarkLocationSelect = () => selected = true;
				const action = bibleChapterClick(root, parameters);
				try {
					button.click();
					expect(opened).toBe(false);
					expect(selected).toBe(false);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

        it.each([
            { intent: BIBLE_CHAPTER_CLICK_INTENTS.READING, wordIndex: 0 },
            { intent: BIBLE_CHAPTER_CLICK_INTENTS.READING, wordIndex: 7 },
            { intent: BIBLE_CHAPTER_CLICK_INTENTS.TEXT_MARKUP, wordIndex: 7 }
        ])('routes inline Bookmark clicks at word $wordIndex in $intent', ({ intent, wordIndex }) => {
            const { root, button } = createBibleBookmark(16, wordIndex);
            let selected: BibleChapterClickTarget | undefined;
            let noteOpens = 0;
            let markupToggles = 0;
            const parameters = createParameters(intent);
            parameters.onOpenBookmark = (target) => selected = target;
            parameters.onOpenNote = () => noteOpens++;
            parameters.onTextMarkupToggle = () => markupToggles++;
            const action = bibleChapterClick(root, parameters);
            try {
                button.click();
                expect(selected).toEqual({ verseNumber: 16, wordIndex });
                expect(noteOpens).toBe(0);
                expect(markupToggles).toBe(0);
            } finally {
                action.destroy();
                root.remove();
            }
        });

        it.each([
            BIBLE_CHAPTER_CLICK_INTENTS.NOTE_LOCATION,
            BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_LOCATION,
            BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_RELOCATION_LOCATION
        ])('blocks inline Bookmark activation during location selection in %s', (intent) => {
            const { root, button } = createBibleBookmark(16, 0);
            let opened = false;
            const parameters = createParameters(intent);
            parameters.onOpenBookmark = () => opened = true;
            const action = bibleChapterClick(root, parameters);
            try {
                button.click();
                expect(opened).toBe(false);
            } finally {
                action.destroy();
                root.remove();
            }
        });

		it(
			'routes inline Note affordances to exact Note navigation',
			() => {
				const { root, button } =
					createBibleNote(16, 7);
				let selected: BibleChapterClickTarget | undefined;
				let buttonClicks = 0;
				button.addEventListener(
					'click',
					() => {
						buttonClicks += 1;
					}
				);
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.READING
				);
				parameters.onOpenNote = (target) => {
					selected = target;
				};

				const action = bibleChapterClick(
					root,
					parameters
				);

				try {
					button.click();

					expect(selected).toEqual({
						verseNumber: 16,
						wordIndex: 7
					});
					expect(buttonClicks).toBe(0);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);

		it(
			'blocks inline Note affordances while choosing a new Note location',
			() => {
				const { root, button } =
					createBibleNote(16, 7);
				let opened = false;
				let selected = false;
				const parameters = createParameters(
					BIBLE_CHAPTER_CLICK_INTENTS.NOTE_LOCATION
				);
				parameters.onOpenNote = () => {
					opened = true;
				};
				parameters.onNoteLocationSelect = () => {
					selected = true;
				};

				const action = bibleChapterClick(
					root,
					parameters
				);

				try {
					button.click();

					expect(opened).toBe(false);
					expect(selected).toBe(false);
				} finally {
					action.destroy();
					root.remove();
				}
			}
		);
	}
);
