import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleTextMarkup
} from '../../../models/bible-text-markup.model';
import {
	applyBibleTextMarkupWord,
	removeBibleTextMarkupWord,
	toggleBibleTextMarkupVerse,
	toggleBibleTextMarkupWord,
	type BibleTextMarkupEditSelection
} from './text-markup-edit';

const background: BibleTextMarkupEditSelection = {
	type: 'bg',
	colorMarkup: 'bg-highlighta'
};

const text: BibleTextMarkupEditSelection = {
	type: 'text',
	colorMarkup: 'text-highlightb'
};

const decoration: BibleTextMarkupEditSelection = {
	type: 'decoration',
	colorMarkup: 'decoration-highlightc'
};

function createTextMarkup(): BibleTextMarkup {
	return {
		id: 'publisher/kjvs/1_1',
		chapterRef: '1_1',
		markings: {}
	};
}

describe(
	'Bible Text Markup edit helper',
	() => {
		it(
			'toggles one word markup without changing other families',
			() => {
				const markup = createTextMarkup();

				applyBibleTextMarkupWord(
					markup,
					1,
					2,
					text
				);
				toggleBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'text-highlightb',
					'bg-highlighta'
				]);

				toggleBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'text-highlightb'
				]);
			}
		);

		it(
			'applies one family idempotently and replaces conflicting values',
			() => {
				const markup = createTextMarkup();
				markup.markings[1] = {
					2: {
						class: [
							'bg-highlightb',
							'bg-highlightc',
							'text-highlightb'
						]
					}
				};

				applyBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);
				applyBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'text-highlightb',
					'bg-highlighta'
				]);
			}
		);

		it(
			'removes one family idempotently and preserves other markup',
			() => {
				const markup = createTextMarkup();
				markup.markings[1] = {
					2: {
						class: [
							'bg-highlighta',
							'text-highlightb'
						]
					}
				};

				removeBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);
				removeBibleTextMarkupWord(
					markup,
					1,
					2,
					background
				);
				removeBibleTextMarkupWord(
					markup,
					1,
					3,
					background
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'text-highlightb'
				]);
				expect(
					markup.markings[1][3]
				).toBeUndefined();
			}
		);

		it(
			'adds and removes decoration companion classes together',
			() => {
				const markup = createTextMarkup();

				applyBibleTextMarkupWord(
					markup,
					1,
					2,
					decoration
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'decoration-highlightc',
					'underline',
					'decoration-solid'
				]);

				markup.markings[1][2].class.unshift(
					'bg-highlighta'
				);
				removeBibleTextMarkupWord(
					markup,
					1,
					2,
					decoration
				);

				expect(
					markup.markings[1][2].class
				).toEqual([
					'bg-highlighta'
				]);
			}
		);

		it(
			'applies drag markup to word index zero without changing the rest of the verse',
			() => {
				const markup = createTextMarkup();
				markup.markings[3] = {
					1: { class: ['text-highlightb'] }
				};

				applyBibleTextMarkupWord(
					markup,
					3,
					0,
					background
				);

				expect(
					markup.markings[3][0].class
				).toEqual(['bg-highlighta']);
				expect(
					markup.markings[3][1].class
				).toEqual(['text-highlightb']);
			}
		);

		it(
			'preserves whole-verse toggle semantics',
			() => {
				const markup = createTextMarkup();

				toggleBibleTextMarkupVerse(
					markup,
					3,
					4,
					background
				);

				expect(
					Object.values(
						markup.markings[3]
					).map((marking) => marking.class)
				).toEqual([
					['bg-highlighta'],
					['bg-highlighta'],
					['bg-highlighta'],
					['bg-highlighta']
				]);

				toggleBibleTextMarkupVerse(
					markup,
					3,
					4,
					background
				);

				expect(
					Object.values(
						markup.markings[3]
					).map((marking) => marking.class)
				).toEqual([
					[],
					[],
					[],
					[]
				]);
			}
		);
	}
);
