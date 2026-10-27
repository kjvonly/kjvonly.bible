import { describe, expect, it } from 'vitest';
import type { Word } from '../models/bible.model';
import { getBibleVerseText } from './bible-verse-text';

function word(text: string, classes: string[] | null = null): Word {
	return { text, class: classes, href: null, emphasis: false };
}

describe('getBibleVerseText', () => {
	it('uses words instead of the legacy text field, excluding vno by default', () => {
		const verse = {
			text: 'incorrect legacy text',
			words: [
				word('1', ['vno']),
				word('In'),
				word('the'),
				word('beginning,', ['redtxt']),
				word('God'),
				word('created.')
			]
		};
		expect(getBibleVerseText(verse)).toBe('In the beginning, God created.');
		expect(verse.text).toBe('incorrect legacy text');
	});

	it('can retain vno for multi-verse text, including tokens with multiple classes', () => {
		const verse = { words: [word('2', ['redtxt', 'vno']), word('And'), word('two')] };
		expect(getBibleVerseText(verse, { includeVerseNumber: true })).toBe('2 And two');
		expect(getBibleVerseText(verse)).toBe('And two');
	});

	it('normalizes whitespace and drops empty tokens without trailing newlines', () => {
		const verse = {
			words: [word('3', ['vno']), word('  For  '), word('\nGod  '), word(''), word(' is\n good.\n')]
		};
		expect(getBibleVerseText(verse)).toBe('For God is good.');
	});

	it('preserves ordinary number words that are not vno', () => {
		const verse = { words: [word('2', ['vno']), word('And'), word('2'), word('words.')] };
		expect(getBibleVerseText(verse)).toBe('And 2 words.');
	});

	it('returns an empty string for verse-number-only content', () => {
		expect(getBibleVerseText({ words: [word('4', ['vno'])] })).toBe('');
	});
});
