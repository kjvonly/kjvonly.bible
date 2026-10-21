import { describe, expect, it } from 'vitest';
import type { Word } from '../models/bible.model';
import { getBibleVerseCopyText } from './bible-verse-copy-text';

function word(text: string, classes: string[] | null = null): Word {
	return { text, class: classes, href: null, emphasis: false };
}

const verses = {
	'1': { words: [word('1', ['vno']), word('In'), word('the'), word('beginning.')] },
	'2': { words: [word('2', ['vno']), word('And'), word('the'), word('earth.')] },
	'4': { words: [word('4', ['vno']), word('And'), word('God'), word('saw.\n')] }
};

describe('getBibleVerseCopyText', () => {
	it('omits the duplicated verse number when copying one verse', () => {
		expect(getBibleVerseCopyText([[1]], verses, 'Genesis 1'))
			.toBe('Genesis 1:1\nIn the beginning.');
	});

	it('retains per-verse numbers when copying consecutive verses', () => {
		expect(getBibleVerseCopyText([[1, 2]], verses, 'Genesis 1'))
			.toBe('Genesis 1:1-2\n1 In the beginning.\n2 And the earth.');
	});

	it('separates disjoint ranges without trailing blank lines', () => {
		expect(getBibleVerseCopyText([[1, 2], [4]], verses, 'Genesis 1'))
			.toBe('Genesis 1:1-2\n1 In the beginning.\n2 And the earth.\n\nGenesis 1:4\nAnd God saw.');
	});

	it('produces no text for an empty selection', () => {
		expect(getBibleVerseCopyText([], verses, 'Genesis 1')).toBe('');
	});
});
