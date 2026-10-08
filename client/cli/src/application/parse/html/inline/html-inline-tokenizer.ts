import type {
	NormalizedContent,
	NormalizedLineBreak,
	NormalizedWord
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineState
} from './html-inline-state.js';

/**
 * Shared visible-text continuity state for one complete inline traversal.
 *
 * This is intentionally separate from cloned semantic decorator state. DOM
 * element boundaries do not themselves create visible whitespace, so descendants
 * and following siblings share one collapsed text stream.
 */
export interface HtmlInlineTextStreamState {
	/** Whether source whitespace has occurred since the previous visible token. */
	pendingSeparator: boolean;

	/**
	 * Canonical line breaks synthesized from source newline characters while
	 * normalizing preformatted text. Explicit HTML <br> line breaks are not
	 * included because they are authored semantics, not cleanup candidates.
	 */
	lineBreaksFromPreformattedSourceNewlines: Set<NormalizedLineBreak>;
}

/** Creates fresh visible-text stream state for one independent inline run. */
export function createHtmlInlineTextStreamState(): HtmlInlineTextStreamState {
	return {
		pendingSeparator:
			false,
		lineBreaksFromPreformattedSourceNewlines:
			new Set<NormalizedLineBreak>()
	};
}

/**
 * Normalizes one source text node into canonical inline units.
 *
 * Normal flow collapses source newlines with ordinary whitespace. A
 * preformatted caller may preserve source newline characters as canonical
 * line-break units while using the same word tokenization contract.
 *
 * `textStream` is shared across recursive inline traversal because DOM text-node
 * and element boundaries do not themselves imply visible separation.
 */
export function appendHtmlInlineText(
	value: string,
	state: HtmlInlineState,
	content: NormalizedContent[],
	textStream: HtmlInlineTextStreamState,
	preservePreformattedSourceNewlines: boolean
): void {
	const normalized =
		value.replace(
			/\u00a0/g,
			' '
		);

	if (!preservePreformattedSourceNewlines) {
		appendCollapsedText(
			normalized,
			state,
			content,
			textStream
		);
		return;
	}

	const lines =
		normalized.split(
			/\r?\n/
		);

	for (
		let index = 0;
		index < lines.length;
		index++
	) {
		appendCollapsedText(
			lines[index] ?? '',
			state,
			content,
			textStream
		);

		if (
			index < lines.length - 1
		) {
			const lineBreak:
				NormalizedLineBreak = {
				type:
					'line-break'
			};

			content.push(
				lineBreak
			);

			textStream.lineBreaksFromPreformattedSourceNewlines.add(
				lineBreak
			);

			// A real line boundary ends horizontal continuity. The next visible
			// token starts a new line regardless of trailing source whitespace.
			textStream.pendingSeparator =
				false;
		}
	}
}

/**
 * Removes boundary line breaks only when they originated from source newline
 * characters preserved for preformatted text. Explicit HTML <br> line breaks
 * remain canonical at any position.
 */
export function trimBoundaryLineBreaksFromPreformattedSourceNewlines(
	content: readonly NormalizedContent[],
	textStream: HtmlInlineTextStreamState
): NormalizedContent[] {
	let start =
		0;
	let end =
		content.length;

	while (
		isLineBreakFromPreformattedSourceNewline(
			content[start],
			textStream
		)
	) {
		start++;
	}

	while (
		isLineBreakFromPreformattedSourceNewline(
			content[end - 1],
			textStream
		)
	) {
		end--;
	}

	return content.slice(
		start,
		end
	);
}

function isLineBreakFromPreformattedSourceNewline(
	entry: NormalizedContent | undefined,
	textStream: HtmlInlineTextStreamState
): entry is NormalizedLineBreak {
	return (
		entry?.type ===
			'line-break' &&
		textStream.lineBreaksFromPreformattedSourceNewlines.has(
			entry
		)
	);
}

/**
 * Collapses source whitespace while preserving whether visible token fragments
 * were actually separated in the source stream.
 */
function appendCollapsedText(
	value: string,
	state: HtmlInlineState,
	content: NormalizedContent[],
	textStream: HtmlInlineTextStreamState
): void {
	const fragments =
		value.split(
			/(\s+)/
		);

	for (
		const fragment of fragments
	) {
		if (!fragment) {
			continue;
		}

		if (/^\s+$/.test(fragment)) {
			// Whitespace may live in a different DOM text node from the next word.
			// Retain that separator across recursive element traversal.
			textStream.pendingSeparator =
				true;
			continue;
		}

		appendWordFragment(
			fragment,
			state,
			content,
			textStream
		);
	}
}

/**
 * Emits one visible word/token fragment with the active inline semantics.
 *
 * Whitespace, rather than DOM node boundaries, defines ordinary word separation.
 * Adjacent fragments with equivalent semantics are merged into one addressable
 * token. When an inline semantic boundary prevents that merge, `joinPrevious`
 * records that the renderer must not invent a space between the fragments.
 */
function appendWordFragment(
	text: string,
	state: HtmlInlineState,
	content: NormalizedContent[],
	textStream: HtmlInlineTextStreamState
): void {
	const word =
		createWord(
			text,
			state
		);

	const previous =
		findPreviousWordBoundary(
			content
		);

	if (
		previous?.word &&
		!textStream.pendingSeparator
	) {
		if (
			!previous.hasInterveningAnchor &&
			hasEquivalentInlineSemantics(
				previous.word,
				word
			)
		) {
			previous.word.text +=
				text;
			return;
		}

		// A zero-width anchor may sit inside one lexical word. It must keep its
		// exact contentIndex, so fragments cannot merge across it; joinPrevious
		// preserves the source's no-whitespace relationship instead.
		word.joinPrevious =
			true;
	}

	content.push(
		word
	);

	textStream.pendingSeparator =
		false;
}

/** Previous visible word plus whether zero-width anchors separate it from the end. */
interface PreviousWordBoundary {
	word: NormalizedWord;
	hasInterveningAnchor: boolean;
}

/**
 * Finds the preceding visible word without treating zero-width anchors as a text
 * boundary. A line break or any future non-anchor inline unit stops continuity.
 */
function findPreviousWordBoundary(
	content: readonly NormalizedContent[]
): PreviousWordBoundary | undefined {
	let hasInterveningAnchor =
		false;

	for (
		let index = content.length - 1;
		index >= 0;
		index--
	) {
		const entry =
			content[index];

		if (!entry) {
			continue;
		}

		if (
			entry.type ===
				'anchor'
		) {
			hasInterveningAnchor =
				true;
			continue;
		}

		if (
			entry.type ===
				'word'
		) {
			return {
				word:
					entry,
				hasInterveningAnchor
			};
		}

		return undefined;
	}

	return undefined;
}

/** Snapshots the current semantic decorator state onto one emitted word token. */
function createWord(
	text: string,
	state: HtmlInlineState
): NormalizedWord {
	const word:
		NormalizedWord = {
			type:
				'word',
			text
		};

	if (
		state.classes.size > 0
	) {
		word.class = [
			...state.classes
		];
	}

	if (
		state.hrefs.length > 0
	) {
		word.href = [
			...state.hrefs
		];
	}

	if (state.emphasis) {
		word.emphasis =
			true;
	}

	if (state.strong) {
		word.strong =
			true;
	}

	if (
		state.marks.size > 0
	) {
		word.marks = [
			...state.marks
		];
	}

	return word;
}

/**
 * Compares only inline meaning, not token text or continuity metadata. Class and
 * mark arrays are semantic sets; href nesting order remains significant.
 */
function hasEquivalentInlineSemantics(
	left: NormalizedWord,
	right: NormalizedWord
): boolean {
	return (
		hasSameSetValues(
			left.class,
			right.class
		) &&
		hasSameOrderedValues(
			left.href,
			right.href
		) &&
		left.emphasis ===
			right.emphasis &&
		left.strong ===
			right.strong &&
		hasSameSetValues(
			left.marks,
			right.marks
		)
	);
}

function hasSameSetValues(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined
): boolean {
	const leftValues =
		left ?? [];
	const rightValues =
		right ?? [];

	return (
		leftValues.length ===
			rightValues.length &&
		leftValues.every(
			(value) =>
				rightValues.includes(
					value
				)
		)
	);
}

function hasSameOrderedValues(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined
): boolean {
	const leftValues =
		left ?? [];
	const rightValues =
		right ?? [];

	return (
		leftValues.length ===
			rightValues.length &&
		leftValues.every(
			(value, index) =>
				value ===
				rightValues[index]
		)
	);
}
