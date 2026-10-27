import type {
	NormalizedClassName,
	NormalizedDocument,
	NormalizedMark
} from '@kjvonly/normalized-content';

/**
 * Compact regression fixtures derived from the supplied normalized-document POC.
 *
 * They intentionally preserve the POC structures that matter to the application
 * without checking the full ~15 MB source corpus into the production repository.
 *
 * Canonical cleanup applied here:
 * - legacy block.text is omitted; content[] is authoritative,
 * - POC /kjv/<book>/<chapter>/<verse>/s_* links are represented as typed
 *   application references: bibleLocationReference:<BibleLocationRef>,
 * - document-local #anchor targets remain document-local.
 */
export const POC_REGRESSION_FIXTURES: readonly NormalizedDocument[] = [
	{
		source: 'poc/spurgeon-sermons-curated',
		blocks: [
			{
				type: 'heading',
				id: 'poc-heading-1',
				level: 1,
				class: [
					'text-center',
				],
				content: [
					word('THE', {
						strong: true
					}),
					word('IMMUTABILITY', {
						strong: true
					}),
					word('OF', {
						strong: true
					}),
					word('GOD', {
						strong: true
					})
				]
			},
			{
				type: 'paragraph',
				id: 'poc-paragraph-1',
				class: ['text-center'],
				content: [
					word('A', { strong: true }),
					word('SERMON', { strong: true }),
					{ type: 'line-break' },
					word('DELIVERED', { strong: true }),
					word('ON', { strong: true }),
					word('SABBATH', { strong: true }),
					word('MORNING,', { strong: true }),
					{ type: 'line-break' },
					word('BY', {
						strong: true,
						emphasis: true
					}),
					word('C.', {
						strong: true,
						emphasis: true
					}),
					word('H.', {
						strong: true,
						emphasis: true
					}),
					word('SPURGEON', {
						strong: true,
						emphasis: true
					})
				]
			},
			{
				type: 'quote',
				id: 'poc-quote-1',
				class: [
					'text-center',
				],
				blocks: [
					{
						type: 'text',
						id: 'poc-text-1',
						class: [
							'text-center',
						],
						content: [
							word('“I', {
								strong: true,
								emphasis: true
							}),
							word('am', {
								strong: true,
								emphasis: true
							}),
							word('the', {
								strong: true,
								emphasis: true
							}),
							word('LORD,', {
								strong: true,
								emphasis: true
							}),
							word('I', {
								strong: true,
								emphasis: true
							}),
							word('change', {
								strong: true,
								emphasis: true
							}),
							word('not;', {
								strong: true,
								emphasis: true
							}),
							{ type: 'line-break' },
							word('Malachi', {
								strong: true,
								emphasis: true
							}),
							word('3:6', {
								strong: true,
								emphasis: true
							})
						]
					}
				]
			},
			{
				type: 'list',
				id: 'poc-list-1',
				class: ['list-roman'],
				ordered: true,
				blocks: [
					{
						type: 'list-item',
						id: 'poc-list_item-1',
						blocks: [
							{
								type: 'text',
								id: 'poc-text-2',
								content: [
									word('I.'),
									word('First'),
									word('of'),
									word('all,')
								]
							},
							{
								type: 'list',
								id: 'poc-list-2',
								class: ['list-arabic'],
								ordered: true,
								blocks: [
									{
										type: 'list-item',
										id: 'poc-list_item-2',
										blocks: [
											{
												type: 'text',
												id: 'poc-text-3',
												content: [
													word('1.'),
													word('I'),
													word('shall'),
													word('offer')
												]
											}
										]
									}
								]
							}
						]
					}
				]
			},
			{
				type: 'paragraph',
				id: 'poc-paragraph-2',
				content: [
					word('June'),
					word('8'),
					word('th', {
						marks: ['small']
					}),
					word(','),
					word('1856,')
				]
			}
		]
	},
	{
		source: 'poc/005_Of-This-Word-Fear-as-Taken-for-God-Himself.json',
		blocks: [
			{
				type: 'heading',
				id: 'poc-heading-2',
				level: 1,
				content: [
					word('John'),
					word('Bunyan'),
					{ type: 'line-break' },
					word('Of'),
					word('This'),
					word('Word'),
					word('Fear')
				]
			},
			{
				type: 'paragraph',
				id: 'p_17',
				content: [
					word('sware'),
					word('by'),
					word('the'),
					word('fear'),
					word('of'),
					word('his'),
					word('father'),
					word('Isaac”'),
					word('('),
					word('Gen', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:1_31_42']
					}),
					word('31:42', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:1_31_42']
					}),
					word(','),
					word('Gen', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:1_31_53']
					}),
					word('31:53', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:1_31_53']
					}),
					word(').'),
					word('[1]', {
						href: ['#fnt1'],
						marks: ['superscript']
					})
				]
			},
			{
				type: 'list',
				id: 'poc-list-3',
				ordered: false,
				blocks: [
					{
						type: 'list-item',
						id: 'poc-list_item-3',
						blocks: [
							{
								type: 'paragraph',
								id: 'p_22',
								content: [
									word('And'),
									word('there'),
									word('are'),
									word('three'),
									word('things')
								]
							},
							{
								type: 'list',
								id: 'poc-list-4',
								ordered: false,
								blocks: [
									{
										type: 'list-item',
										id: 'poc-list_item-4',
										blocks: [
											{
												type: 'paragraph',
												id: 'p_23',
												content: [
													word('1.'),
													word('The'),
													word('first'),
													word('is'),
													word('God’s'),
													word('own'),
													word('greatness')
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
	},
	{
		source: 'poc/Commentary-on-Genesis-1.json',
		blocks: [
			{
				type: 'heading',
				id: 'poc-heading-3',
				level: 1,
				content: [
					word('Matthew'),
					word('Henry'),
					{ type: 'line-break' },
					word('Commentary'),
					word('on'),
					word('Genesis'),
					word('1')
				]
			},
			{
				type: 'heading',
				id: 'poc-heading-4',
				level: 4,
				content: [
					word('Chapter'),
					word('1')
				]
			},
			{
				type: 'paragraph',
				id: 'poc-paragraph-3',
				content: [
					word('“Where'),
					word('is'),
					word('God'),
					word('my'),
					word('Maker?”'),
					word('('),
					word('Job', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:22_35_10']
					}),
					word('35:10', {
						class: [
							'nowrap',
						],
						href: ['bibleLocationReference:22_35_10']
					}),
					word(')')
				]
			},
			{
				type: 'list',
				id: 'poc-list-5',
				ordered: false,
				blocks: [
					{
						type: 'list-item',
						id: 'poc-list_item-5',
						blocks: [
							{
								type: 'text',
								id: 'poc-text-4',
								content: [
									word('1.'),
									word('Observe,'),
									word('in'),
									word('this'),
									word('verse,')
								]
							},
							{
								type: 'list',
								id: 'poc-list-6',
								ordered: false,
								blocks: [
									{
										type: 'list-item',
										id: 'poc-list_item-6',
										blocks: [
											{
												type: 'text',
												id: 'poc-text-5',
												content: [
													word('(1.)'),
													word('The'),
													word('effect'),
													word('produced—')
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
];

type WordOptions = {
	class?: NormalizedClassName[];
	href?: string[];
	emphasis?: true;
	strong?: true;
	marks?: NormalizedMark[];
};

function word(
	text: string,
	options: WordOptions = {}
) {
	return {
		type: 'word' as const,
		text,
		...options
	};
}
