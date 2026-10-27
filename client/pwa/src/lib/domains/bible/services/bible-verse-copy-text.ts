import type { Verse } from '../models/bible.model';
import { getBibleVerseText } from './bible-verse-text';

/**
 * Formats selected consecutive verse ranges for copying.
 *
 * A single-verse range already names the verse in its heading, so its body
 * omits `vno`. Multi-verse ranges retain each verse number. Nonconsecutive
 * ranges are separated by one blank line, with no trailing newline.
 */
export function getBibleVerseCopyText(
	verseRanges: readonly (readonly number[])[],
	verses: Readonly<Record<string, Pick<Verse, 'words'>>>,
	chapterTitle: string
): string {
	return verseRanges
		.map((range) => getVerseRangeCopyText(range, verses, chapterTitle))
		.filter(Boolean)
		.join('\n\n');
}

/** Formats one inclusive verse range with a reference heading. */
function getVerseRangeCopyText(
	range: readonly number[],
	verses: Readonly<Record<string, Pick<Verse, 'words'>>>,
	chapterTitle: string
): string {
	if (range.length === 0) {
		return '';
	}

	const start = range[0];
	const end = range[range.length - 1];
	const singleVerse = start === end;
	const title = singleVerse
		? `${chapterTitle}:${start}`
		: `${chapterTitle}:${start}-${end}`;

	const verseTexts = Array.from(
		{ length: end - start + 1 },
		(_, index) => verses[String(start + index)]
	)
		.filter((verse): verse is Pick<Verse, 'words'> => verse !== undefined)
		.map((verse) => getBibleVerseText(verse, {
			includeVerseNumber: !singleVerse
		}))
		.filter(Boolean);

	return [title, ...verseTexts].join('\n');
}
