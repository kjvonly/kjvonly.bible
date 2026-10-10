/** Semantic Bible token identity exposed by the Reader DOM. */
export interface BibleWordTarget {
	/** One-based verse number within the rendered chapter. */
	readonly verseNumber: number;
	/** Token index within the verse; `0` is the rendered verse-number token. */
	readonly wordIndex: number;
}

/**
 * Resolves one event/hit-test target to the nearest rendered Bible token.
 *
 * @param root - Chapter interaction root that bounds eligible Bible tokens.
 * @param target - DOM event target or browser hit-test result.
 * @returns Parsed Bible token identity, or undefined when the target is outside the chapter token surface.
 */
export function resolveBibleWordTarget(
	root: HTMLElement,
	target: EventTarget | null
): BibleWordTarget | undefined {
	return resolveBibleTarget(
		root,
		target,
		'[data-bible-word]'
	);
}

/**
 * Resolves one inline Note affordance to its associated Bible token identity.
 *
 * @param root - Chapter interaction root that bounds eligible Note affordances.
 * @param target - DOM event target inside or on an inline Note button.
 * @returns Associated Bible token identity, or `undefined` outside the Note surface.
 */
export function resolveBibleNoteTarget(
	root: HTMLElement,
	target: EventTarget | null
): BibleWordTarget | undefined {
	return resolveBibleTarget(
		root,
		target,
		'[data-bible-note]'
	);
}

/** Shared `closest(...)` parser for Reader-owned semantic DOM identities. */
function resolveBibleTarget(
	root: HTMLElement,
	target: EventTarget | null,
	selector: string
): BibleWordTarget | undefined {
	const ElementConstructor =
		root.ownerDocument.defaultView?.Element;

	if (
		!ElementConstructor ||
		!(target instanceof ElementConstructor)
	) {
		return undefined;
	}

	const targetElement =
		(target as Element)
			.closest<HTMLElement>(selector);

	if (
		!targetElement ||
		!root.contains(targetElement)
	) {
		return undefined;
	}

	const verseNumber = Number(
		targetElement.dataset.verse
	);
	const wordIndex = Number(
		targetElement.dataset.wordIndex
	);

	if (
		!Number.isInteger(verseNumber) ||
		!Number.isInteger(wordIndex) ||
		verseNumber <= 0 ||
		wordIndex < 0
	) {
		return undefined;
	}

	return {
		verseNumber,
		wordIndex
	};
}
