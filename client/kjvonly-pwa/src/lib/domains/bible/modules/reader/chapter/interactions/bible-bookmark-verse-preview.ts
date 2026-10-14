import type { Verse } from '../../../../models/bible.model';
import type { BibleChapterClickTarget } from './bible-chapter-click';

/** Captures the containing verse for either a verse-number or word Bookmark. */
export function getBibleBookmarkVersePreview(
	verses: Readonly<Record<string, Pick<Verse, 'text'>>>,
	target: BibleChapterClickTarget
): string | undefined {
	const text = verses[String(target.verseNumber)]?.text.replace(/\s+/g, ' ').trim();
	return text || undefined;
}
