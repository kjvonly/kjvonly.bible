import {
	readFileSync
} from 'node:fs';

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	NormalizedDocumentValidator
} from '@kjvonly/normalized-content';

import {
	DeterministicNormalizedBlockIdGenerator
} from '../identity/deterministic-normalized-block-id-generator.js';

import {
	HtmlInlineParser
} from '../inline/html-inline-parser.js';

import {
	HtmlInlineProcessorRegistry
} from '../inline/html-inline-processor-registry.js';

import {
	AnchorInlineProcessor
} from '../inline/processors/anchor-inline-processor.js';

import {
	EmphasisInlineProcessor
} from '../inline/processors/emphasis-inline-processor.js';

import {
	LineBreakInlineProcessor
} from '../inline/processors/line-break-inline-processor.js';

import {
	MarkInlineProcessor
} from '../inline/processors/mark-inline-processor.js';

import {
	StrongInlineProcessor
} from '../inline/processors/strong-inline-processor.js';

import {
	CaptionBlockProcessor
} from '../processors/caption-block-processor.js';

import {
	FigureBlockProcessor
} from '../processors/figure-block-processor.js';

import {
	HeadingBlockProcessor
} from '../processors/heading-block-processor.js';

import {
	ListBlockProcessor
} from '../processors/list-block-processor.js';

import {
	ListItemBlockProcessor
} from '../processors/list-item-block-processor.js';

import {
	ParagraphBlockProcessor
} from '../processors/paragraph-block-processor.js';

import {
	PreformattedBlockProcessor
} from '../processors/preformatted-block-processor.js';

import {
	QuoteBlockProcessor
} from '../processors/quote-block-processor.js';

import {
	TableBlockProcessor
} from '../processors/table-block-processor.js';

import {
	TableCellBlockProcessor
} from '../processors/table-cell-block-processor.js';

import {
	TableRowBlockProcessor
} from '../processors/table-row-block-processor.js';

import {
	TableSectionBlockProcessor
} from '../processors/table-section-block-processor.js';

import {
	ThematicBreakBlockProcessor
} from '../processors/thematic-break-block-processor.js';

import {
	TransparentContainerBlockProcessor
} from '../processors/transparent-container-block-processor.js';

import {
	UnsupportedSemanticBlockProcessor
} from '../processors/unsupported-semantic-block-processor.js';

import {
	HtmlBlockProcessorRegistry
} from '../registry/html-block-processor-registry.js';

import {
	CheerioHtmlParser
} from '../parser/cheerio-html-parser.js';

import {
	HtmlNormalizedDocumentConverter
} from './html-normalized-document-converter.js';

import type {
	HtmlNormalizedDocumentConversionOptions
} from './html-normalized-document-converter.js';

interface GoldenFixture {
	readonly name: string;
	readonly rootSelector: string;
}

const fixtures:
	readonly GoldenFixture[] = [
		{
			name:
				'sermon-like',
			rootSelector:
				'#content-root'
		},
		{
			name:
				'book-like',
			rootSelector:
				'main'
		}
	];

const converter =
	createConverter();

const htmlParser =
	new CheerioHtmlParser();

function convertHtml(
	html: string,
	options:
		HtmlNormalizedDocumentConversionOptions = {}
): NormalizedDocument {
	return converter.convert(
		htmlParser.parse(
			html
		),
		options
	);
}

describe(
	'HtmlNormalizedDocumentConverter golden fixtures',
	() => {
		for (
			const fixture of fixtures
		) {
			it(
				`preserves normalized semantics for ${fixture.name}`,
				() => {
					const html =
						readFixture(
							`${fixture.name}.html`
						);

					const source =
						`fixtures/${fixture.name}.html`;

					const first =
						convertHtml(
							html,
							{
								rootSelector:
									fixture.rootSelector,
								source
							}
						);

					const second =
						convertHtml(
							html,
							{
								rootSelector:
									fixture.rootSelector,
								source
							}
						);

					expect(
						second
					).toEqual(
						first
					);

					expect(
						normalizeGeneratedIds(
								first
							)
					).toEqual(
						readExpectedFixture(
							fixture.name
						)
					);
				}
			);
		}
	}
);

function createConverter():
	HtmlNormalizedDocumentConverter {
	const blockProcessorRegistry =
		new HtmlBlockProcessorRegistry([
			new CaptionBlockProcessor(),
			new FigureBlockProcessor(),
			new HeadingBlockProcessor(),
			new ParagraphBlockProcessor(),
			new PreformattedBlockProcessor(),
			new TableBlockProcessor(),
			new TableCellBlockProcessor(),
			new TableRowBlockProcessor(),
			new TableSectionBlockProcessor(),
			new ThematicBreakBlockProcessor(),
			new QuoteBlockProcessor(),
			new ListBlockProcessor(),
			new ListItemBlockProcessor(),
			new TransparentContainerBlockProcessor(),
			new UnsupportedSemanticBlockProcessor()
		]);

	const inlineProcessorRegistry =
		new HtmlInlineProcessorRegistry([
			new LineBreakInlineProcessor(),
			new AnchorInlineProcessor(),
			new EmphasisInlineProcessor(),
			new StrongInlineProcessor(),
			new MarkInlineProcessor(
				[
					'sup'
				],
				'superscript'
			),
			new MarkInlineProcessor(
				[
					'sub'
				],
				'subscript'
			),
			new MarkInlineProcessor(
				[
					'u'
				],
				'underline'
			),
			new MarkInlineProcessor(
				[
					'del',
					's',
					'strike'
				],
				'strikethrough'
			),
			new MarkInlineProcessor(
				[
					'small'
				],
				'small'
			),
			new MarkInlineProcessor(
				[
					'code'
				],
				'code'
			),
			new MarkInlineProcessor(
				[
					'mark'
				],
				'highlight'
			)
		]);

	const inlineParser =
		new HtmlInlineParser(
			inlineProcessorRegistry,
			tag =>
				blockProcessorRegistry.has(
					tag
				)
		);

	return new HtmlNormalizedDocumentConverter(
		new NormalizedDocumentValidator(),
		blockProcessorRegistry,
		inlineParser,
		() =>
			new DeterministicNormalizedBlockIdGenerator()
	);
}

function readFixture(
	name: string
): string {
	return readFileSync(
		new URL(
			`./fixtures/${name}`,
			import.meta.url
		),
		'utf8'
	);
}

function readExpectedFixture(
	name: string
): NormalizedDocument {
	return JSON.parse(
		readFixture(
			`${name}.expected.json`
		)
	) as NormalizedDocument;
}

function normalizeGeneratedIds(
	document: NormalizedDocument
): NormalizedDocument {
	const normalized =
		structuredClone(
			document
		);

	normalizeBlockIds(
		normalized.blocks
	);

	return normalized;
}

function normalizeBlockIds(
	blocks: NormalizedBlock[]
): void {
	for (
		const block of blocks
	) {
		if (
			block.id?.startsWith(
				'nd-'
			)
		) {
			block.id =
				'<generated>';
		}

		if ('blocks' in block) {
			normalizeBlockIds(
				block.blocks
			);
		}
	}
}
