import { describe, expect, it } from 'vitest';
import { getBibleBookmarkVersePreview } from './bible-bookmark-verse-preview';

const verses = {
	'16': {
		text: ' For God so loved the world,\nthat he gave his only begotten Son. '
	},
	'17': { text: 'For God sent not his Son into the world to condemn the world.' }
};

describe('getBibleBookmarkVersePreview', () => {
	it('uses the full containing verse for the verse-number token', () => {
		expect(getBibleBookmarkVersePreview(verses, { verseNumber: 16, wordIndex: 0 }))
			.toBe('For God so loved the world, that he gave his only begotten Son.');
	});

	it('uses the same containing verse for an exact word Bookmark', () => {
		expect(getBibleBookmarkVersePreview(verses, { verseNumber: 16, wordIndex: 7 }))
			.toBe('For God so loved the world, that he gave his only begotten Son.');
	});

	it('does not fall back to another verse for an unavailable target', () => {
		expect(getBibleBookmarkVersePreview(verses, { verseNumber: 18, wordIndex: 0 }))
			.toBeUndefined();
	});

	it('does not save empty verse text', () => {
		expect(getBibleBookmarkVersePreview({ '16': { text: ' \n  ' } }, {
			verseNumber: 16, wordIndex: 1
		})).toBeUndefined();
	});
});
