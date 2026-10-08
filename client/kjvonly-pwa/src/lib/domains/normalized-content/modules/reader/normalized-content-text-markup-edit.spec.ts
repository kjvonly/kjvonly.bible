import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import type {
	NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';
import {
	applyNormalizedContentTextMarkupWord,
	removeNormalizedContentTextMarkupWord,
	toggleNormalizedContentTextMarkupWord,
	type NormalizedContentTextMarkupEditSelection
} from './normalized-content-text-markup-edit';

const background: NormalizedContentTextMarkupEditSelection = {
	type: 'bg',
	colorMarkup: 'bg-highlighta'
};

const text: NormalizedContentTextMarkupEditSelection = {
	type: 'text',
	colorMarkup: 'text-highlightb'
};

const decoration: NormalizedContentTextMarkupEditSelection = {
	type: 'decoration',
	colorMarkup: 'decoration-highlightc'
};

const document: NormalizedDocument = {
	blocks: [
		{
			type: 'paragraph',
			id: 'paragraph-1',
			content: [
				{
					type: 'word',
					text: 'First'
				},
				{
					type: 'anchor',
					id: 'anchor-1'
				},
				{
					type: 'word',
					text: 'Second'
				},
				{
					type: 'line-break'
				}
			]
		},
		{
			type: 'quote',
			id: 'quote-1',
			blocks: [
				{
					type: 'paragraph',
					id: '__proto__',
					content: [
						{
							type: 'word',
							text: 'Nested'
						}
					]
				}
			]
		}
	]
};

function createMarkings(): NormalizedContentTextMarkupMap {
	return {};
}

describe(
	'Normalized Content Text Markup edit helper',
	() => {
		it(
			'toggles one word without changing independent markup families',
			() => {
				const markings = createMarkings();
				const address = {
					blockId: 'paragraph-1',
					contentIndex: 0
				};

				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					text
				);
				toggleNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);

				expect(
					markings['paragraph-1']['0'].class
				).toEqual([
					'text-highlightb',
					'bg-highlighta'
				]);

				toggleNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);

				expect(
					markings['paragraph-1']['0'].class
				).toEqual([
					'text-highlightb'
				]);
			}
		);

		it(
			'applies one family idempotently and replaces conflicting values',
			() => {
				const markings: NormalizedContentTextMarkupMap = {
					'paragraph-1': {
						'2': {
							class: [
								'bg-highlightb',
								'bg-highlightc',
								'text-highlightb'
							]
						}
					}
				};
				const address = {
					blockId: 'paragraph-1',
					contentIndex: 2
				};

				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);
				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);

				expect(
					markings['paragraph-1']['2'].class
				).toEqual([
					'text-highlightb',
					'bg-highlighta'
				]);
			}
		);

		it(
			'removes one family idempotently and preserves other markup',
			() => {
				const markings: NormalizedContentTextMarkupMap = {
					'paragraph-1': {
						'0': {
							class: [
								'bg-highlighta',
								'text-highlightb'
							]
						}
					}
				};
				const address = {
					blockId: 'paragraph-1',
					contentIndex: 0
				};

				removeNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);
				removeNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					background
				);

				expect(
					markings['paragraph-1']['0'].class
				).toEqual([
					'text-highlightb'
				]);
			}
		);

		it(
			'adds and removes decoration companion classes together',
			() => {
				const markings = createMarkings();
				const address = {
					blockId: 'paragraph-1',
					contentIndex: 0
				};

				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					decoration
				);

				expect(
					markings['paragraph-1']['0'].class
				).toEqual([
					'decoration-highlightc',
					'underline',
					'decoration-solid'
				]);

				markings['paragraph-1']['0'].class.unshift(
					'bg-highlighta'
				);
				removeNormalizedContentTextMarkupWord(
					document,
					markings,
					address,
					decoration
				);

				expect(
					markings['paragraph-1']['0'].class
				).toEqual([
					'bg-highlighta'
				]);
			}
		);

		it(
			'uses canonical contentIndex rather than a derived visible-word index',
			() => {
				const markings = createMarkings();

				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					{
						blockId: 'paragraph-1',
						contentIndex: 2
					},
					background
				);

				expect(
					markings['paragraph-1']
				).toEqual({
					'2': {
						class: ['bg-highlighta']
					}
				});
			}
		);

		it(
			'rejects anchors, line breaks, and unresolved addresses',
			() => {
				const markings = createMarkings();

				for (const address of [
					{
						blockId: 'paragraph-1',
						contentIndex: 1
					},
					{
						blockId: 'paragraph-1',
						contentIndex: 3
					},
					{
						blockId: 'missing',
						contentIndex: 0
					}
				]) {
					expect(
						() =>
							applyNormalizedContentTextMarkupWord(
								document,
								markings,
								address,
								background
							)
					).toThrow(
						'Normalized Content Text Markup target must resolve to a word'
					);
				}

				expect(markings).toEqual({});
			}
		);

		it(
			'handles source block IDs that collide with JavaScript prototype keys',
			() => {
				const markings = createMarkings();

				applyNormalizedContentTextMarkupWord(
					document,
					markings,
					{
						blockId: '__proto__',
						contentIndex: 0
					},
					background
				);

				expect(
					Object.prototype.hasOwnProperty.call(
						markings,
						'__proto__'
					)
				).toBe(true);
				expect(
					markings['__proto__']['0'].class
				).toEqual([
					'bg-highlighta'
				]);
				expect(
					JSON.stringify(markings)
				).toBe(
					'{"__proto__":{"0":{"class":["bg-highlighta"]}}}'
				);
			}
		);
	}
);
