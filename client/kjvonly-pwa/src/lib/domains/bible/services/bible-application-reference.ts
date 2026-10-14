import chapterVerseCounts from './bibleMetadata/json/booksChaptersVerseCountByID.json';

/**
 * Validates an application reference using the Bible Reader's existing
 * `bookId_chapter[_verseOrRange[_wordIndex]]` location format.
 *
 * Book/chapter/verse bounds come from canonical Bible metadata; verse ranges
 * are inclusive and must be contained within the selected chapter. The optional
 * word index is zero-based (`0` denotes the verse-number token); its upper
 * bound depends on the selected Bible version and is not known at this stage.
 * Invalid references do not select a fallback location.
 */
export function parseBibleLocationRef(
	value: string
): string | undefined {
	const segments = value.split('_');
	if (segments.length < 2 || segments.length > 4) {
		return undefined;
	}

	const [bookSegment, chapterSegment, verseSegment, wordSegment] = segments;
	const bookId = parseCanonicalInteger(bookSegment ?? '');
	const chapter = parseCanonicalInteger(chapterSegment ?? '');
	const verseBounds = verseSegment === undefined
		? undefined
		: parseCanonicalVerseBounds(verseSegment);
	const wordIndex = wordSegment === undefined
		? undefined
		: parseCanonicalInteger(wordSegment);

	if (
		bookId === undefined ||
		chapter === undefined ||
		bookId < 1 ||
		chapter < 1 ||
		(verseSegment !== undefined && verseBounds === undefined) ||
		(wordSegment !== undefined && wordIndex === undefined)
	) {
		return undefined;
	}

	const bookChapters = (
		chapterVerseCounts as Readonly<
			Record<string, Readonly<Record<string, number>>>
		>
	)[String(bookId)];
	const verseCount = bookChapters?.[String(chapter)];
	if (verseCount === undefined) {
		return undefined;
	}

	if (
		verseBounds !== undefined &&
		(verseBounds.start < 1 || verseBounds.end > verseCount)
	) {
		return undefined;
	}

	if (
		wordIndex !== undefined &&
		(verseBounds === undefined || wordIndex < 0)
	) {
		return undefined;
	}

	return value;
}

function parseCanonicalInteger(segment: string): number | undefined {
	if (!/^(0|[1-9][0-9]*)$/.test(segment)) {
		return undefined;
	}

	const value = Number(segment);
	return Number.isSafeInteger(value) ? value : undefined;
}

/** Parses a single verse or an inclusive `start-end` range. */
function parseCanonicalVerseBounds(
	segment: string
): { start: number; end: number } | undefined {
	const parts = segment.split('-');
	if (parts.length > 2) {
		return undefined;
	}

	const start = parseCanonicalInteger(parts[0] ?? '');
	const end = parts.length === 2
		? parseCanonicalInteger(parts[1] ?? '')
		: start;
	if (start === undefined || end === undefined || start > end) {
		return undefined;
	}

	return { start, end };
}
