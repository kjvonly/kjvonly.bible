import type {
	BibleWordTarget
} from './bible-word-target';

/**
 * Creates one canonical verse- or word-level Bible location for a selected Reader token.
 * Verse numbers use `wordIndex = 0`; words retain their positive word index.
 *
 * @param bookIDChapter - Canonical chapter scope, for example `43_3`.
 * @param target - Delegated Reader token identity selected for the new Note.
 * @returns Canonical `bookID_chapter_verse_wordIndex` Note anchor.
 * @throws When the target cannot represent a verse number or word location.
 */
export function createBibleNoteLocationRef(
	bookIDChapter: string,
	target: BibleWordTarget
): string {
	if (
		target.verseNumber <= 0 ||
		target.wordIndex < 0
	) {
		throw new Error(
			'Add Note requires a valid Bible location'
		);
	}

	return `${bookIDChapter}_${target.verseNumber}_${target.wordIndex}`;
}
