import type {
	BibleTextMarkup,
	BibleTextMarkupMarking
} from '../../../models/bible-text-markup.model';

export interface BibleTextMarkupEditSelection {
	readonly type: string;
	readonly colorMarkup: string;
}

/**
 * Toggles the selected markup family for one word.
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
 * Applies the selected markup family to one word without toggling it off.
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
 * Removes the selected markup family from one word when present.
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
 * Preserves the Reader's existing verse-number click behavior: the selected
 * family is toggled across every word index in the verse based on word index 0.
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

function hasMarkupFamily(
	marking: BibleTextMarkupMarking,
	type: string
): boolean {
	return marking.class.some(
		(className) => className.startsWith(type)
	);
}

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
