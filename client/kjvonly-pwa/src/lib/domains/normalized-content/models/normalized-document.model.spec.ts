import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock,
	NormalizedDocument
} from '$lib/domains/normalized-content';

const representativeDocument: NormalizedDocument = {
	source: 'poc/representative',
	blocks: [
		{
			type: 'heading',
			level: 1,
			content: [
				{
					type: 'word',
					text: 'Representative'
				},
				{
					type: 'line-break'
				},
				{
					type: 'word',
					text: 'Document'
				}
			]
		},
		{
			type: 'paragraph',
			id: 'paragraph-1',
			content: [
				{
					type: 'word',
					text: 'Genesis',
					href: [
						'1_1_1'
					],
					strong: true
				},
				{
					type: 'word',
					text: 'note',
					href: [
						'#fn1'
					],
					marks: [
						'superscript'
					]
				}
			]
		},
		{
			type: 'list',
			ordered: true,
			blocks: [
				{
					type: 'list-item',
					blocks: [
						{
							type: 'text',
							content: [
								{
									type: 'word',
									text: 'Parent'
								}
							]
						},
						{
							type: 'list',
							ordered: false,
							blocks: [
								{
									type: 'list-item',
									blocks: [
										{
											type: 'text',
											content: [
												{
													type: 'word',
													text: 'Child',
													emphasis: true,
													class: [
														'color-dark-blue'
													],
													marks: [
														'small'
													]
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		}
	]
};

describe(
	'NormalizedDocument',
	() => {
		it(
			'expresses recursive POC-style structured content',
			() => {
				const list = representativeDocument.blocks[2];
				const listItem = list.blocks?.[0];
				const nestedList = listItem?.blocks?.[1];

				expect(
					representativeDocument.blocks.map(
						(block) => block.type
					)
				).toEqual([
					'heading',
					'paragraph',
					'list'
				]);
				expect(
					nestedList?.blocks?.[0].blocks?.[0].content?.[0]
				).toMatchObject({
					type: 'word',
					text: 'Child',
					emphasis: true
				});
			}
		);

		it(
			'keeps inline content as the canonical visible block representation',
			() => {
				const paragraph = representativeDocument.blocks[1];

				expect(
					paragraph.content
				).toEqual([
					expect.objectContaining({
						type: 'word',
						text: 'Genesis'
					}),
					expect.objectContaining({
						type: 'word',
						text: 'note'
					})
				]);
				expect(
					'text' in paragraph
				).toBe(false);
			}
		);

		it(
			'keeps duplicate block text out of the canonical contract',
			() => {
				const hasBlockText: 'text' extends keyof NormalizedBlock
					? true
					: false = false;

				expect(
					hasBlockText
				).toBe(false);
			}
		);
	}
);
