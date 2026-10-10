import type {
	BibleTextMarkup,
	BibleTextMarkupMarking
} from '../../../models/bible-text-markup.model';

/** Current Text Markup family/class selected by the Reader edit toolbar. */
export interface BibleTextMarkupEditSelection {
	/** Markup family prefix, such as `bg`, `text`, or `decoration`. */
	readonly type: string;
	/** Concrete class applied for the selected family/color. */
	readonly colorMarkup: string;
}

/**
 * Toggles the selected markup family for one Bible token.
 *
 * Existing classes from other markup families are preserved.
 *
 * @param textMarkup - Mutable Reader Text Markup draft.
 * @param verseNumber - Verse containing the target token.
 * @param wordIndex - Token index; `0` is the verse-number token.
 * @param selection - Currently selected markup family/class.
 */
export function toggleBibleTextMarkupWord(
	textMarkup: BibleTextMarkup,
	verseNumber: number,
	wordIndex: number,
	selection: BibleTextMarkupEditSelection
): void {
	const marking = requireWordMarking(
		textMarkup,
		verseNumber,
		wordIndex
	);

	if (hasMarkupFamily(marking, selection.type)) {
		removeMarkupFamily(marking, selection.type);
		return;
	}

	addSelectedMarkup(marking, selection);
}

/**
 * Applies the selected markup family to one token without toggling it off.
 *
 * Used by rightward drag painting; repeated application is idempotent for the
 * selected family and preserves unrelated markup families.
 *
 * @param textMarkup - Mutable Reader Text Markup draft.
 * @param verseNumber - Verse containing the target token.
 * @param wordIndex - Token index; `0` is the verse-number token.
 * @param selection - Currently selected markup family/class.
 */
export function applyBibleTextMarkupWord(
	textMarkup: BibleTextMarkup,
	verseNumber: number,
	wordIndex: number,
	selection: BibleTextMarkupEditSelection
): void {
	const marking = requireWordMarking(
		textMarkup,
		verseNumber,
		wordIndex
	);

	removeMarkupFamily(marking, selection.type);
	addSelectedMarkup(marking, selection);
}

/**
 * Removes the selected markup family from one token when present.
 *
 * Used by leftward drag erasing and intentionally preserves unrelated families.
 *
 * @param textMarkup - Mutable Reader Text Markup draft.
 * @param verseNumber - Verse containing the target token.
 * @param wordIndex - Token index; `0` is the verse-number token.
 * @param selection - Currently selected markup family/class.
 */
export function removeBibleTextMarkupWord(
	textMarkup: BibleTextMarkup,
	verseNumber: number,
	wordIndex: number,
	selection: BibleTextMarkupEditSelection
): void {
	const marking =
		textMarkup.markings[verseNumber]?.[wordIndex];

	if (!marking) {
		return;
	}

	removeMarkupFamily(marking, selection.type);
}

/**
 * Toggles the selected family across the whole verse for a verse-number click.
 *
 * Word index `0` is the control token used to decide whether this invocation
 * applies or removes the family. Dragging across index `0` does not call this
 * helper; drag treats the verse number as one ordinary paint target.
 *
 * @param textMarkup - Mutable Reader Text Markup draft.
 * @param verseNumber - Verse toggled by the verse-number click.
 * @param wordCount - Number of token indexes to update in the verse.
 * @param selection - Currently selected markup family/class.
 */
export function toggleBibleTextMarkupVerse(
	textMarkup: BibleTextMarkup,
	verseNumber: number,
	wordCount: number,
	selection: BibleTextMarkupEditSelection
): void {
	const verseMarking = requireWordMarking(
		textMarkup,
		verseNumber,
		0
	);
	const remove = hasMarkupFamily(
		verseMarking,
		selection.type
	);

	for (
		let wordIndex = 0;
		wordIndex < wordCount;
		wordIndex += 1
	) {
		const marking = requireWordMarking(
			textMarkup,
			verseNumber,
			wordIndex
		);

		removeMarkupFamily(marking, selection.type);

		if (!remove) {
			addSelectedMarkup(marking, selection);
		}
	}
}

/**
 * Returns the mutable marking for one token, creating its sparse entry as needed.
 */
function requireWordMarking(
	textMarkup: BibleTextMarkup,
	verseNumber: number,
	wordIndex: number
): BibleTextMarkupMarking {
	if (!textMarkup.markings[verseNumber]) {
		textMarkup.markings[verseNumber] = {};
	}

	if (!textMarkup.markings[verseNumber][wordIndex]) {
		textMarkup.markings[verseNumber][wordIndex] = {
			class: []
		};
	}

	return textMarkup.markings[verseNumber][wordIndex];
}

/** Tests whether a token contains any class from one markup family. */
function hasMarkupFamily(
	marking: BibleTextMarkupMarking,
	type: string
): boolean {
	return marking.class.some(
		(className) => className.startsWith(type)
	);
}

/**
 * Removes only the selected family and its decoration companion classes.
 */
function removeMarkupFamily(
	marking: BibleTextMarkupMarking,
	type: string
): void {
	const classes = marking.class.filter(
		(className) => !className.startsWith(type)
	);

	if (type === 'decoration') {
		const filtered = classes.filter(
			(className) => className !== 'underline'
		);
		marking.class.splice(
			0,
			marking.class.length,
			...filtered
		);
		return;
	}

	marking.class.splice(
		0,
		marking.class.length,
		...classes
	);
}

/**
 * Applies the selected class and companion classes required by its family.
 */
function addSelectedMarkup(
	marking: BibleTextMarkupMarking,
	selection: BibleTextMarkupEditSelection
): void {
	marking.class.push(selection.colorMarkup);

	if (selection.type === 'decoration') {
		marking.class.push(
			'underline',
			'decoration-solid'
		);
	}
}
