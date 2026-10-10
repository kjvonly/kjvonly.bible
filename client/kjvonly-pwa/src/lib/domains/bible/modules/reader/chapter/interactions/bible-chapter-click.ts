import {
	resolveBibleNoteTarget,
	resolveBibleWordTarget,
	type BibleWordTarget
} from './bible-word-target';

export const BIBLE_CHAPTER_CLICK_INTENTS = {
	READING: 'reading',
	TEXT_MARKUP: 'text-markup',
	NOTE_LOCATION: 'note-location'
} as const;

export type BibleChapterClickIntent =
	typeof BIBLE_CHAPTER_CLICK_INTENTS[
		keyof typeof BIBLE_CHAPTER_CLICK_INTENTS
	];

export type BibleChapterClickTarget =
	BibleWordTarget;

/** Callbacks and current intent used by the delegated chapter click router. */
export interface BibleChapterClickParameters {
	/** Determines which mutually exclusive Reader click behavior is active. */
	readonly intent: BibleChapterClickIntent;
	/**
	 * Handles reading-mode activation. Return `true` only when the token is
	 * interactive so ordinary Bible-word clicks remain untouched.
	 */
	readonly onReadingActivate: (
		target: BibleChapterClickTarget
	) => boolean;
	/** Toggles Text Markup for the resolved edit-mode token. */
	readonly onTextMarkupToggle: (
		target: BibleChapterClickTarget
	) => void;
	/** Completes Add Note location selection with the resolved Bible token. */
	readonly onNoteLocationSelect: (
		target: BibleChapterClickTarget
	) => void;
	/** Opens the existing exact-location Note affordance that was clicked. */
	readonly onOpenNote: (
		target: BibleChapterClickTarget
	) => void;
}

/**
 * Delegates chapter token and inline-Note clicks through one capture listener.
 *
 * Note-location selection is exclusive: while active, every chapter click is
 * consumed before inline Notes or markup can respond. Reading mode consumes only
 * tokens the chapter reports as interactive. Text Markup consumes any valid Bible
 * token, including the verse-number token at `wordIndex = 0`.
 *
 * @param node - Chapter interaction root containing rendered Bible tokens.
 * @param initialParameters - Current Reader click intent and chapter-owned callbacks.
 * @returns Svelte action lifecycle hooks for reactive parameter updates/cleanup.
 */
export function bibleChapterClick(
	node: HTMLElement,
	initialParameters: BibleChapterClickParameters
) {
	let parameters = initialParameters;

	/** Resolves and dispatches one capture-phase click according to Reader intent. */
	function onClick(event: MouseEvent): void {
		if (
			parameters.intent ===
			BIBLE_CHAPTER_CLICK_INTENTS.NOTE_LOCATION
		) {
			consumeClick(event);

			const target = resolveBibleWordTarget(
				node,
				event.target
			);

			if (target) {
				parameters.onNoteLocationSelect(target);
			}
			return;
		}

		const noteTarget = resolveBibleNoteTarget(
			node,
			event.target
		);

		if (noteTarget) {
			consumeClick(event);
			parameters.onOpenNote(noteTarget);
			return;
		}

		const target = resolveBibleWordTarget(
			node,
			event.target
		);

		if (!target) {
			return;
		}

		if (
			parameters.intent ===
			BIBLE_CHAPTER_CLICK_INTENTS.READING
		) {
			if (!parameters.onReadingActivate(target)) {
				return;
			}

			consumeClick(event);
			return;
		}

		consumeClick(event);
		parameters.onTextMarkupToggle(target);
	}

	node.addEventListener(
		'click',
		onClick,
		true
	);

	return {
		update(nextParameters: BibleChapterClickParameters) {
			parameters = nextParameters;
		},
		destroy() {
			node.removeEventListener(
				'click',
				onClick,
				true
			);
		}
	};
}

/** Prevents a handled chapter click from reaching token-local/default behavior. */
function consumeClick(event: MouseEvent): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
}
