import type { Verse } from '../models/bible.model';

export interface BibleVerseTextOptions {
	/** Retain the `vno` token when displaying or copying multiple verses. */
	includeVerseNumber?: boolean;
}

/**
 * Reconstructs a verse from its canonical word tokens, without `verse.text`.
 *
 * Tokens carry their own punctuation. Separate nonempty tokens with a single
 * space (as the Bible reader does), normalize incidental whitespace inside
 * tokens, and optionally exclude verse-number tokens. The result has no
 * leading/trailing whitespace or newlines.
 */
export function getBibleVerseText(
	verse: Pick<Verse, 'words'>,
	{ includeVerseNumber = false }: BibleVerseTextOptions = {}
): string {
	return verse.words
		.filter((word) => includeVerseNumber || !word.class?.includes('vno'))
		.map((word) => word.text.replace(/\s+/g, ' ').trim())
		.filter((text) => text.length > 0)
		.join(' ');
}
