import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock,
	NormalizedHeadingLevel
} from '@kjvonly/normalized-content';

import {
	resolveNormalizedBlockPresentation
} from './normalized-block-presentation';

describe(
	'resolveNormalizedBlockPresentation',
	() => {
		it.each([
			[
				1,
				'h1'
			],
			[
				2,
				'h2'
			],
			[
				3,
				'h3'
			],
			[
				4,
				'h4'
			],
			[
				5,
				'h5'
			],
			[
				6,
				'h6'
			]
		] as const)(
			'preserves semantic heading level %s',
			(
				level,
				element
			) => {
				expect(
					resolveNormalizedBlockPresentation({
						type:
							'heading',
						id:
							`heading-${level}`,
						level:
							level as NormalizedHeadingLevel,
						content: []
					}).element
				).toBe(
					element
				);
			}
		);

		it.each([
			[
				{
					type: 'paragraph',
					id: 'paragraph-1',
					content: []
				},
				'p',
				'content'
			],
			[
				{
					type: 'text',
					id: 'text-1',
					content: []
				},
				'span',
				'content'
			],
			[
				{
					type: 'preformatted',
					id: 'preformatted-1',
					content: []
				},
				'pre',
				'content'
			],
			[
				{
					type: 'thematic-break',
					id: 'thematic-break-1'
				},
				'hr',
				'none'
			],
			[
				{
					type: 'quote',
					id: 'quote-1',
					blocks: []
				},
				'blockquote',
				'blocks'
			],
			[
				{
					type: 'list-item',
					id: 'list-item-1',
					blocks: []
				},
				'li',
				'blocks'
			],
			[
				{
					type: 'figure',
					id: 'figure-1',
					blocks: []
				},
				'figure',
				'blocks'
			],
			[
				{
					type: 'table',
					id: 'table-1',
					blocks: []
				},
				'table',
				'blocks'
			]
		] as const)(
			'maps %s to semantic %s rendering',
			(
				block,
				element,
				contentKind
			) => {
				expect(
					resolveNormalizedBlockPresentation(
						block as NormalizedBlock
					).element
				).toBe(
					element
				);

				expect(
					resolveNormalizedBlockPresentation(
						block as NormalizedBlock
					).contentKind
				).toBe(
					contentKind
				);
			}
		);

		it(
			'preserves ordered and unordered list semantics',
			() => {
				expect(
					resolveNormalizedBlockPresentation({
						type:
							'list',
						id:
							'ordered-list',
						ordered:
							true,
						blocks: []
					}).element
				).toBe(
					'ol'
				);

				expect(
					resolveNormalizedBlockPresentation({
						type:
							'list',
						id:
							'unordered-list',
						ordered:
							false,
						blocks: []
					}).element
				).toBe(
					'ul'
				);
			}
		);

		it(
			'renders captions according to their canonical figure or table owner',
			() => {
				const caption: NormalizedBlock = {
					type:
						'caption',
					id:
						'caption-1',
					blocks: []
				};

				expect(
					resolveNormalizedBlockPresentation(
						caption,
						{
							parentType:
								'figure'
						}
					).element
				).toBe(
					'figcaption'
				);

				expect(
					resolveNormalizedBlockPresentation(
						caption,
						{
							parentType:
								'table'
						}
					).element
				).toBe(
					'caption'
				);

				expect(
					() =>
						resolveNormalizedBlockPresentation(
							caption
						)
				).toThrow(
					'Unsupported normalized caption parent: root'
				);
			}
		);

		it(
			'renders table rows and cells only beneath their canonical structural owners',
			() => {
				const row: NormalizedBlock = {
					type:
						'table-row',
					id:
						'table-row-1',
					blocks: []
				};
				const headerCell: NormalizedBlock = {
					type:
						'table-cell',
					id:
						'table-header-1',
					header:
						true,
					blocks: []
				};
				const dataCell: NormalizedBlock = {
					type:
						'table-cell',
					id:
						'table-data-1',
					header:
						false,
					blocks: []
				};

				expect(
					resolveNormalizedBlockPresentation(
						row,
						{
							parentType:
								'table'
						}
					).element
				).toBe(
					'tr'
				);

				expect(
					resolveNormalizedBlockPresentation(
						headerCell,
						{
							parentType:
								'table-row'
						}
					).element
				).toBe(
					'th'
				);

				expect(
					resolveNormalizedBlockPresentation(
						dataCell,
						{
							parentType:
								'table-row'
						}
					).element
				).toBe(
					'td'
				);

				expect(
					() =>
						resolveNormalizedBlockPresentation(
							row
						)
				).toThrow(
					'Unsupported normalized table-row parent: root'
				);

				expect(
					() =>
						resolveNormalizedBlockPresentation(
							headerCell,
							{
								parentType:
									'table'
							}
						)
				).toThrow(
					'Unsupported normalized table-cell parent: table'
				);
			}
		);
		it(
			'fails visibly when unvalidated runtime data contains an unknown block type',
			() => {
				expect(
					() =>
						resolveNormalizedBlockPresentation(
							{
								type: 'unknown-block',
								id: 'unknown-1'
							} as unknown as NormalizedBlock
						)
				).toThrow(
					'Unsupported normalized block type: unknown-block'
				);
			}
		);

	}
);
