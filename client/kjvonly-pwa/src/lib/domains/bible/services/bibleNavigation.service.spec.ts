import { describe, expect, it } from 'vitest';

import { BibleLocationReferenceService } from './bibleLocationReference.service';

import { BibleNavigationService, books } from './bibleNavigation.service';

describe('BibleNavigationService', () => {
	const service = new BibleNavigationService(
		new BibleLocationReferenceService()
	);

	it('moves to the next chapter', () => {
		expect(service.next('1_1')).toBe('1_2');
	});

	it('moves to the previous chapter', () => {
		expect(service.previous('1_2')).toBe('1_1');
	});

	it('moves from the final chapter of a book to the first chapter of the next book', () => {
		expect(service.next('1_50')).toBe('2_1');
	});

	it('moves from the first chapter of a book to the final chapter of the previous book', () => {
		expect(service.previous('2_1')).toBe('1_50');
	});

	it('navigates across non-contiguous canonical book ids', () => {
		expect(service.next('16_13')).toBe('19_1');

		expect(service.previous('19_1')).toBe('16_13');
	});

	it('should match max chapter for each book', () => {
		let maxChatperById: Record<string, number> = {
			'1': 50,
			'2': 40,
			'3': 27,
			'4': 36,
			'5': 34,
			'6': 24,
			'7': 21,
			'8': 4,
			'9': 31,
			'10': 24,
			'11': 22,
			'12': 25,
			'13': 29,
			'14': 36,
			'15': 10,
			'16': 13,
			'19': 10,
			'22': 42,
			'23': 150,
			'24': 31,
			'25': 12,
			'26': 8,
			'29': 66,
			'30': 52,
			'31': 5,
			'33': 48,
			'34': 12,
			'35': 14,
			'36': 3,
			'37': 9,
			'38': 1,
			'39': 4,
			'40': 7,
			'41': 3,
			'42': 3,
			'43': 3,
			'44': 2,
			'45': 14,
			'46': 4,
			'47': 28,
			'48': 16,
			'49': 24,
			'50': 21,
			'51': 28,
			'52': 16,
			'53': 16,
			'54': 13,
			'55': 6,
			'56': 6,
			'57': 4,
			'58': 4,
			'59': 5,
			'60': 3,
			'61': 6,
			'62': 4,
			'63': 3,
			'64': 1,
			'65': 13,
			'66': 5,
			'67': 5,
			'68': 3,
			'69': 5,
			'70': 1,
			'71': 1,
			'72': 1,
			'73': 22
		};

		books.forEach((b) => {
			expect(maxChatperById[b.bookID]).toEqual(b.maxChapter);
		});

		expect(books.length).toEqual(66);
		expect(Object.keys(maxChatperById).length).toEqual(66);
	});

	it('ignores version, verse, and word-index detail when navigating', () => {
		expect(service.next('kjv/1_1_3_4')).toBe('1_2');
	});

	it('wraps from the final chapter to the first chapter', () => {
		expect(service.next('73_22')).toBe('1_1');
	});

	it('walks all 1,189 chapters before wrapping to the first chapter', () => {
		const startChapter = '1_1';
		const visited = new Set<string>();
		let chapter = startChapter;

		do {
			expect(visited.has(chapter)).toBe(false);

			visited.add(chapter);
			chapter = service.next(chapter);
		} while (chapter !== startChapter);

		expect(visited.size).toBe(1189);
	});

	it('wraps from the first chapter to the final chapter', () => {
		expect(service.previous('1_1')).toBe('73_22');
	});

	it('rejects an unknown chapter when moving forward', () => {
		expect(() => service.next('1_999')).toThrow('Unknown Bible chapter: 1_999');
	});

	it('rejects an unknown chapter when moving backward', () => {
		expect(() => service.previous('1_999')).toThrow(
			'Unknown Bible chapter: 1_999'
		);
	});

	it('rejects a non-canonical book id', () => {
		expect(() => service.next('17_1')).toThrow('Unknown Bible chapter: 17_1');
	});
});
