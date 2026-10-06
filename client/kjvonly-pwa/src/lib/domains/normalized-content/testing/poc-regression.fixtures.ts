import type {
	NormalizedDocument
} from '../models/normalized-document.model';

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
				level: 1,
				class: [
					'text-center',
					'color-blue'
				],
				content: [
					word('THE', {
						class: ['color-blue'],
						strong: true
					}),
					word('IMMUTABILITY', {
						class: ['color-blue'],
						strong: true
					}),
					word('OF', {
						class: ['color-blue'],
						strong: true
					}),
					word('GOD', {
						class: ['color-blue'],
						strong: true
					})
				]
			},
			{
				type: 'paragraph',
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
				class: [
					'text-center',
					'color-dark-blue'
				],
				blocks: [
					{
						type: 'text',
						class: [
							'quote-text',
							'text-center',
							'color-dark-blue'
						],
						content: [
							word('“I', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('am', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('the', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('LORD,', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('I', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('change', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('not;', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							{ type: 'line-break' },
							word('Malachi', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							}),
							word('3:6', {
								class: ['color-dark-blue'],
								strong: true,
								emphasis: true
							})
						]
					}
				]
			},
			{
				type: 'list',
				class: ['list-roman'],
				ordered: true,
				blocks: [
					{
						type: 'list-item',
						blocks: [
							{
								type: 'text',
								class: [
									'list-marker',
									'list-marker-roman'
								],
								content: [
									word('I.'),
									word('First'),
									word('of'),
									word('all,')
								]
							},
							{
								type: 'list',
								class: ['list-arabic'],
								ordered: true,
								blocks: [
									{
										type: 'list-item',
										blocks: [
											{
												type: 'text',
												class: [
													'list-marker',
													'list-marker-arabic'
												],
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
							'blb-tagged'
						],
						href: ['bibleLocationReference:1_31_42']
					}),
					word('31:42', {
						class: [
							'nowrap',
							'blb-tagged'
						],
						href: ['bibleLocationReference:1_31_42']
					}),
					word(','),
					word('Gen', {
						class: [
							'nowrap',
							'blb-tagged'
						],
						href: ['bibleLocationReference:1_31_53']
					}),
					word('31:53', {
						class: [
							'nowrap',
							'blb-tagged'
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
				ordered: false,
				blocks: [
					{
						type: 'list-item',
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
								ordered: false,
								blocks: [
									{
										type: 'list-item',
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
				level: 4,
				content: [
					word('Chapter'),
					word('1')
				]
			},
			{
				type: 'paragraph',
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
							'blb-tagged'
						],
						href: ['bibleLocationReference:22_35_10']
					}),
					word('35:10', {
						class: [
							'nowrap',
							'blb-tagged'
						],
						href: ['bibleLocationReference:22_35_10']
					}),
					word(')')
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
									word('1.'),
									word('Observe,'),
									word('in'),
									word('this'),
									word('verse,')
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
	class?: string[];
	href?: string[];
	emphasis?: boolean;
	strong?: boolean;
	marks?: string[];
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
