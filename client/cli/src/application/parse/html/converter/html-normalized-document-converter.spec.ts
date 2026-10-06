import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock
} from '#domain/normalized-content/models/normalized-block.model.js';

import {
	NormalizedDocumentValidator
} from '#domain/normalized-content/validation/normalized-document-validator.js';

import {
	DeterministicNormalizedBlockIdGenerator
} from '../identity/deterministic-normalized-block-id-generator.js';

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
	HtmlBlockProcessorRegistry
} from '../registry/html-block-processor-registry.js';

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
	CheerioHtmlParser
} from '../parser/cheerio-html-parser.js';

import {
	HtmlNormalizedDocumentConverter
} from './html-normalized-document-converter.js';

import type {
	HtmlNormalizedDocumentConversionOptions
} from './html-normalized-document-converter.js';

const validator =
	new NormalizedDocumentValidator();

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

const converter =
	new HtmlNormalizedDocumentConverter(
		validator,
		blockProcessorRegistry,
		inlineParser,
		() =>
			new DeterministicNormalizedBlockIdGenerator()
	);

const htmlParser =
	new CheerioHtmlParser();

function convertHtml(
	html: string,
	options:
		HtmlNormalizedDocumentConversionOptions = {}
) {
	return converter.convert(
		htmlParser.parse(
			html
		),
		options
	);
}

function convertHtmlWithDiagnostics(
	html: string,
	options:
		HtmlNormalizedDocumentConversionOptions = {}
) {
	return converter.convertWithDiagnostics(
		htmlParser.parse(
			html
		),
		options
	);
}

describe(
	'HtmlNormalizedDocumentConverter',
	() => {
		it(
			'walks recursively through block strategies and emits the current normalized contract',
			() => {
				const document =
					convertHtml(
						`<main id="content-root">
							<section>
								<h1 id="title">A <strong>Title</strong></h1>
								<p>Before <em>quoted</em> text.</p>
								<blockquote>
									Quoted before
									<ul>
										<li>First</li>
										<li>Second <ol><li>Nested</li></ol></li>
									</ul>
									Quoted after
								</blockquote>
							</section>
						</main>`,
						{
							rootSelector:
								'#content-root',
							source:
								'fixture/example.html'
						}
					);

				expect(
					() =>
						validator.validate(
							document
						)
				).not.toThrow();

				expect(
					document.source
				).toBe(
					'fixture/example.html'
				);

				expect(
					document.blocks.map(
						block =>
							block.type
					)
				).toEqual([
					'heading',
					'paragraph',
					'quote'
				]);

				expect(
					document.blocks[0]
				).toMatchObject({
					type:
						'heading',
					id:
						'title',
					level:
						1,
					content: [
						{
							type:
								'word',
							text:
								'A'
						},
						{
							type:
								'word',
							text:
								'Title',
							strong:
								true
						}
					]
				});

				const quote =
					requireBlockType(
						document.blocks,
						2,
						'quote'
					);

				expect(
					quote.blocks.map(
						block =>
							block.type
					)
				).toEqual([
					'text',
					'list',
					'text'
				]);

				const list =
					requireBlockType(
						quote.blocks,
						1,
						'list'
					);

				expect(
					list.ordered
				).toBe(
					false
				);

				const secondListItem =
					requireBlockType(
						list.blocks,
						1,
						'list-item'
					);

				const nestedList =
					requireBlockType(
						secondListItem.blocks,
						1,
						'list'
					);

				expect(
					nestedList
				).toMatchObject({
					type:
						'list',
					ordered:
						true
				});
			}
		);

		it(
			'uses recursive inline processors for links, marks, emphasis, strong, classes, and line breaks',
			() => {
				const document =
					convertHtml(
						`<p class="text-center publisher-only" style="text-align:center">
							<a href="#note"><strong><em>linked</em></strong></a>
							<br>
							<span class="publisher-blue unknown"><sup>2</sup></span>
							<small>small</small>
						</p>`
					);

				const paragraph =
					requireBlockType(
						document.blocks,
						0,
						'paragraph'
					);

				expect(
					paragraph.class
				).toEqual([
					'text-center'
				]);

				expect(
					paragraph.content
				).toEqual([
					{
						type:
							'word',
						text:
							'linked',
						href: [
							'#note'
						],
						emphasis:
							true,
						strong:
							true
					},
					{
						type:
							'line-break'
					},
					{
						type:
							'word',
						text:
							'2',
						marks: [
							'superscript'
						]
					},
					{
						type:
							'word',
						text:
							'small',
						marks: [
							'small'
						]
					}
				]);
			}
		);

		it(
			'preserves inline link semantics across block descendants',
			() => {
				const document =
					convertHtml(
						`<a href="/kjv/1_1_1">Before<p>KJV <strong>Bible</strong></p><blockquote><p>Quoted</p></blockquote>After</a>`
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type: 'text',
						content: [
							{
								type: 'word',
								text: 'Before',
								href: [
									'/kjv/1_1_1'
								]
							}
						]
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'word',
								text: 'KJV',
								href: [
									'/kjv/1_1_1'
								]
							},
							{
								type: 'word',
								text: 'Bible',
								href: [
									'/kjv/1_1_1'
								],
								strong: true
							}
						]
					},
					{
						type: 'quote',
						blocks: [
							{
								type: 'paragraph',
								content: [
									{
										type: 'word',
										text: 'Quoted',
										href: [
											'/kjv/1_1_1'
										]
									}
								]
							}
						]
					},
					{
						type: 'text',
						content: [
							{
								type: 'word',
								text: 'After',
								href: [
									'/kjv/1_1_1'
								]
							}
						]
					}
				]);
			}
		);

		it(
			'composes nested inline semantics across block descendants',
			() => {
				const document =
					convertHtml(
						'<a href="#kjv"><del><p>KJV</p></del></a>'
					);

				const paragraph =
					requireBlockType(
						document.blocks,
						0,
						'paragraph'
					);

				expect(
					paragraph.content
				).toEqual([
					{
						type: 'word',
						text: 'KJV',
						href: [
							'#kjv'
						],
						marks: [
							'strikethrough'
						]
					}
				]);
			}
		);

		it(
			'preserves explicit br elements at paragraph boundaries and as standalone content',
			() => {
				const document =
					convertHtml(
						'<p><br></p><p id="kjv"><br>KJV<br></p>'
					);

				const lineBreakOnly =
					requireBlockType(
						document.blocks,
						0,
						'paragraph'
					);

				const paragraph =
					requireBlockType(
						document.blocks,
						1,
						'paragraph'
					);

				expect(
					lineBreakOnly.content
				).toEqual([
					{
						type:
							'line-break'
					}
				]);

				expect(
					paragraph.content
				).toEqual([
					{
						type:
							'line-break'
					},
					{
						type:
							'word',
						text:
							'KJV'
					},
					{
						type:
							'line-break'
					}
				]);
			}
		);

		it(
			'preserves preformatted line structure and thematic breaks as semantic blocks',
			() => {
				const document =
					convertHtml(
						`<pre id="code">Alpha\nBravo\n\nCharlie</pre><hr id="break">`
					);

				expect(
					document.blocks
				).toEqual([
					{
						type:
							'preformatted',
						id:
							'code',
						content: [
							{
								type:
									'word',
								text:
									'Alpha'
							},
							{
								type:
									'line-break'
							},
							{
								type:
									'word',
								text:
									'Bravo'
							},
							{
								type:
									'line-break'
							},
							{
								type:
									'line-break'
							},
							{
								type:
									'word',
								text:
									'Charlie'
							}
						]
					},
					{
						type:
							'thematic-break',
						id:
							'break'
					}
				]);
			}
		);

		it(
			'preserves figure and caption boundaries around recursive textual content',
			() => {
				const document =
					convertHtml(
						`<figure id="figure-1"><figcaption id="caption-1">Caption <strong>text</strong></figcaption><p id="body-1">Body</p></figure>`
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type:
							'figure',
						id:
							'figure-1',
						blocks: [
							{
								type:
									'caption',
								id:
									'caption-1',
								blocks: [
									{
										type:
											'text',
										content: [
											{
												type:
													'word',
												text:
													'Caption'
											},
											{
												type:
													'word',
												text:
													'text',
												strong:
													true
											}
										]
									}
								]
							},
							{
								type:
									'paragraph',
								id:
									'body-1'
							}
						]
					}
				]);
			}
		);

		it(
			'preserves table rows, cells, captions, and header-cell semantics',
			() => {
				const document =
					convertHtml(
						`<table id="table-1"><caption id="caption-1">People</caption><thead><tr id="head-row"><th id="name-head">Name</th><th>Role</th></tr></thead><tbody><tr id="data-row"><td id="name-cell">Paul</td><td><p id="role">Apostle</p></td></tr></tbody></table>`
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type:
							'table',
						id:
							'table-1',
						blocks: [
							{
								type:
									'caption',
								id:
									'caption-1'
							},
							{
								type:
									'table-row',
								id:
									'head-row',
								blocks: [
									{
										type:
											'table-cell',
										id:
											'name-head',
										header:
											true
									},
									{
										type:
											'table-cell',
										header:
											true
									}
								]
							},
							{
								type:
									'table-row',
								id:
									'data-row',
								blocks: [
									{
										type:
											'table-cell',
										id:
											'name-cell',
										header:
											false
									},
									{
										type:
											'table-cell',
										header:
											false,
										blocks: [
											{
												type:
													'paragraph',
												id:
													'role'
											}
										]
									}
								]
							}
						]
					}
				]);
			}
		);

		it(
			'preserves an explicitly empty anchor href because href is a consumed source attribute',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p><a href="">KJV</a></p>'
					);

				expect(
					result.document.blocks[0]
				).toMatchObject({
					type:
						'paragraph',
					content: [
						{
							type:
								'word',
							text:
								'KJV',
							href: [
								''
							]
						}
					]
				});

				expect(
					result.diagnostics.warnings.filter(
						warning =>
							warning.code ===
								'html-attribute-unsupported'
					)
				).toEqual([]);
			}
		);

		it(
			'drops unsafe executable href behavior while preserving visible content and reporting it',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p><a href="javascript:alert(1)">KJV</a></p>'
					);

				expect(
					result.document.blocks[0]
				).toMatchObject({
					type:
						'paragraph',
					content: [
						{
							type:
								'word',
							text:
								'KJV'
						}
					]
				});

				expect(
					result.diagnostics.linkedWordsProduced
				).toBe(
					0
				);

				expect(
					result.diagnostics.warnings
				).toContainEqual({
					code:
						'html-link-target-unsafe',
					message:
						'Unsafe source HTML link target on <a href="javascript:alert(1)"> uses the javascript: scheme; descendant content was normalized, but executable link behavior was not preserved.',
					count:
						1
				});
			}
		);

		it(
			'preserves an unresolved document-local href and reports the missing canonical target',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p><a href="#fn1">KJV</a></p>'
					);

				expect(
					result.document.blocks[0]
				).toMatchObject({
					type:
						'paragraph',
					content: [
						{
							type:
								'word',
							text:
								'KJV',
							href: [
								'#fn1'
							]
						}
					]
				});

				expect(
					result.diagnostics.warnings
				).toContainEqual({
					code:
						'html-local-link-target-missing',
					message:
						'Document-local source link target "#fn1" on <a href="#fn1"> does not resolve to a canonical block or inline anchor inside the selected extraction boundary.',
					count:
						1
				});
			}
		);

		it(
			'does not warn when a document-local href resolves to a canonical inline anchor',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p><a href="#fn1">KJV</a><span id="fn1"></span></p>'
					);

				expect(
					result.diagnostics.warnings.filter(
						warning =>
							warning.code ===
								'html-local-link-target-missing'
					)
				).toEqual([]);
			}
		);

		it.each([
			[
				'<blockquote cite="/source">KJV quotation</blockquote>',
				'cite',
				'<blockquote cite="/source">'
			],
			[
				'<ol start="2"><li>Second reading</li></ol>',
				'start',
				'<ol start="2">'
			],
			[
				'<ol type="I"><li>KJV edition</li></ol>',
				'type',
				'<ol type="I">'
			],
			[
				'<ol><li value="3">Third reading</li></ol>',
				'value',
				'<li value="3">'
			],
			[
				'<table summary="KJV readings"><tr><td>Genesis</td></tr></table>',
				'summary',
				'<table summary="KJV readings">'
			],
			[
				'<table><tr><td colspan="2">Genesis</td></tr></table>',
				'colspan',
				'<td colspan="2">'
			],
			[
				'<table><tr><th scope="col">Book</th></tr></table>',
				'scope',
				'<th scope="col">'
			],
			[
				'<p><del datetime="2026-10-04">old KJV note</del></p>',
				'datetime',
				'<del datetime="2026-10-04">'
			],
			[
				'<p><a href="/kjv/1_1_1" target="_blank">Genesis 1:1</a></p>',
				'target',
				'<a href="/kjv/1_1_1" target="_blank">'
			]
		])(
			'preserves supported content and reports unsupported source attribute %s',
			(
				html: string,
				attribute: string,
				openingTag: string
			) => {
				const result =
					convertHtmlWithDiagnostics(
						html
					);

				expect(
					result.document.blocks.length
				).toBeGreaterThan(
					0
				);

				expect(
					result.diagnostics.warnings
				).toContainEqual({
					code:
						'html-attribute-unsupported',
					message:
						`Unsupported source HTML attribute "${attribute}" on ${openingTag}; the element was normalized, but this attribute's semantics were not preserved.`,
					count:
						1
				});
			}
		);

		it(
			'preserves otherwise-empty semantic blocks when they carry source identity',
			() => {
				const document =
					convertHtml(
						`<p id="paragraph-anchor"></p>
						<h2 id="heading-anchor"></h2>
						<pre id="pre-anchor"></pre>
						<blockquote id="quote-anchor"></blockquote>
						<ul id="list-anchor"><li id="item-anchor"></li></ul>
						<figure id="figure-anchor"><figcaption id="caption-anchor"></figcaption></figure>`
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type:
							'paragraph',
						id:
							'paragraph-anchor',
						content: []
					},
					{
						type:
							'heading',
						id:
							'heading-anchor',
						content: []
					},
					{
						type:
							'preformatted',
						id:
							'pre-anchor',
						content: []
					},
					{
						type:
							'quote',
						id:
							'quote-anchor',
						blocks: []
					},
					{
						type:
							'list',
						id:
							'list-anchor',
						blocks: [
							{
								type:
									'list-item',
								id:
									'item-anchor',
								blocks: []
							}
						]
					},
					{
						type:
							'figure',
						id:
							'figure-anchor',
						blocks: [
							{
								type:
									'caption',
								id:
									'caption-anchor',
								blocks: []
							}
						]
					}
				]);
			}
		);

		it(
			'preserves an empty semantic block with supported normalized presentation',
			() => {
				const document =
					convertHtml(
						`<p class="text-center"></p>`
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type:
							'paragraph',
						class: [
							'text-center'
						],
						content: []
					}
				]);
			}
		);

		it(
			'drops otherwise-empty semantic blocks that carry no canonical metadata',
			() => {
				const document =
					convertHtml(
						`<p></p><h1></h1><pre></pre><blockquote></blockquote><ul></ul><figure></figure><p class="publisher-only"></p>`
					);

				expect(
					document.blocks
				).toEqual([]);
			}
		);

		it(
			'preserves source ids and deterministically generates ids for every other block',
			() => {
				const html =
					`<h2 id="source-heading">Heading</h2>
					<p>Alpha paragraph</p>
					<blockquote>Quote</blockquote>`;

				const first =
					convertHtml(
						html
					);

				const second =
					convertHtml(
						html
					);

				expect(
					requireBlock(
						first.blocks,
						0
					).id
				).toBe(
					'source-heading'
				);

				expect(
					collectBlockIds(
						first.blocks
					)
				).toEqual(
					collectBlockIds(
						second.blocks
					)
				);

				expect(
					collectBlockIds(
						first.blocks
					).every(
						id =>
							Boolean(
								id
							)
					)
				).toBe(
					true
				);
			}
		);

		it(
			'renumbers later generated ids of the same type when a block is inserted',
			() => {
				const before =
					convertHtml(
						`<p>Alpha</p><p>Bravo</p>`
					);

				const after =
					convertHtml(
						`<p>Inserted</p><p>Alpha</p><p>Bravo</p>`
					);

				expect(
					requireBlock(
						before.blocks,
						0
					).id
				).toBe(
					'nd-v1-paragraph-1'
				);

				expect(
					requireBlock(
						after.blocks,
						1
					).id
				).toBe(
					'nd-v1-paragraph-2'
				);

				expect(
					requireBlock(
						after.blocks,
						2
					).id
				).toBe(
					'nd-v1-paragraph-3'
				);
			}
		);

		it(
			'assigns consecutive ordinals even when generated blocks have identical content',
			() => {
				const document =
					convertHtml(
						`<p>Same</p><p>Same</p>`
					);

				expect(
					requireBlock(
						document.blocks,
						0
					).id
				).toBe(
					'nd-v1-paragraph-1'
				);

				expect(
					requireBlock(
						document.blocks,
						1
					).id
				).toBe(
					'nd-v1-paragraph-2'
				);
			}
		);

		it(
			'does not emit legacy duplicate block text',
			() => {
				const document =
					convertHtml(
						`<p>Canonical content only</p>`
					);

				expect(
					'text' in requireBlock(
						document.blocks,
						0
					)
				).toBe(
					false
				);
			}
		);

		it(
			'preserves unsupported inline content and reports the source tag with attributes',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p>Published <time datetime="2026-10-04" data-source="publisher">today</time>.</p>'
					);

				expect(
					result.document.blocks[0]
				).toMatchObject({
					type: 'paragraph',
					content: [
						{
							type: 'word',
							text: 'Published'
						},
						{
							type: 'word',
							text: 'today.'
						}
					]
				});

				expect(
					result.diagnostics.warnings
				).toContainEqual({
					code: 'html-element-unsupported',
					message: 'Unsupported source HTML element <time data-source="publisher" datetime="2026-10-04">; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
					count: 1
				});
			}
		);

		it(
			'preserves registered structural descendants inside unsupported wrappers',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<details open><summary>More</summary><p>Hidden text</p></details>'
					);

				expect(
					result.document.blocks
				).toMatchObject([
					{
						type: 'text',
						content: [
							{
								type: 'word',
								text: 'More'
							}
						]
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'word',
								text: 'Hidden'
							},
							{
								type: 'word',
								text: 'text'
							}
						]
					}
				]);

				expect(
					result.diagnostics.warnings
				).toEqual(
					expect.arrayContaining([
						{
							code: 'html-element-unsupported',
							message: 'Unsupported source HTML element <details open>; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
							count: 1
						},
						{
							code: 'html-element-unsupported',
							message: 'Unsupported source HTML element <summary>; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
							count: 1
						}
					])
				);
			}
		);

		it(
			'reports unsupported leaf elements even when they have no descendant text to preserve',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<p>Logo <img alt="Publisher logo"></p>'
					);

				expect(
					result.document.blocks[0]
				).toMatchObject({
					type: 'paragraph',
					content: [
						{
							type: 'word',
							text: 'Logo'
						}
					]
				});

				expect(
					result.diagnostics.warnings
				).toContainEqual({
					code: 'html-element-unsupported',
					message: 'Unsupported source HTML element <img alt="Publisher logo">; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
					count: 1
				});
			}
		);

		it(
			'preserves descendants of known unsupported semantic blocks and reports each source boundary',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						'<dl class="legacy-definitions"><dt>Term</dt><dd>Definition</dd></dl>'
					);

				expect(
					result.document.blocks
				).toMatchObject([
					{
						type: 'text',
						content: [
							{
								type: 'word',
								text: 'Term'
							}
						]
					},
					{
						type: 'text',
						content: [
							{
								type: 'word',
								text: 'Definition'
							}
						]
					}
				]);

				expect(
					result.diagnostics.warnings.filter(
						warning =>
							warning.code ===
								'html-element-unsupported'
					)
				).toHaveLength(
					3
				);
			}
		);

		it(
			'rejects duplicate source ids because durable document locations would be ambiguous',
			() => {
				expect(
					() =>
						convertHtml(
							`<p id="duplicate">One</p><p id="duplicate">Two</p>`
						)
				).toThrow(
					'Duplicate HTML id: duplicate'
				);
			}
		);

		it(
			'rejects duplicate identity shared by a block and inline anchor',
			() => {
				expect(
					() =>
						convertHtml(
							`<p id="fn1">KJV <span id="fn1"></span></p>`
						)
				).toThrow(
					'Duplicate HTML id: fn1'
				);
			}
		);

		it(
			'rejects an addressable transparent container rather than silently losing its id',
			() => {
				expect(
					() =>
						convertHtml(
							`<section id="section-anchor"><p>Text</p></section>`
						)
				).toThrow(
					'Cannot discard addressable container <section>#section-anchor.'
				);
			}
		);


		it(
			'preserves inline source ids as zero-width canonical anchors',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						`<p>Before <span id="fn1">KJV</span> after</p>`
					);

				const paragraph =
					requireBlockType(
						result.document.blocks,
						0,
						'paragraph'
					);

				expect(
					paragraph.content
				).toEqual([
					{ type: 'word', text: 'Before' },
					{
						type: 'anchor',
						id: 'fn1'
					},
					{ type: 'word', text: 'KJV' },
					{ type: 'word', text: 'after' }
				]);

				expect(
					result.diagnostics.sourceIdsPreserved
				).toBe(
					1
				);
				expect(
					result.diagnostics.idsGenerated
				).toBe(
					1
				);
			}
		);

		it(
			'preserves an inline anchor boundary when its element wraps a block descendant',
			() => {
				const document =
					convertHtml(
						`<a id="fn1" href="#fn1"><p>KJV</p></a>`
					);

				const anchorBlock =
					requireBlockType(
						document.blocks,
						0,
						'text'
					);
				const paragraph =
					requireBlockType(
						document.blocks,
						1,
						'paragraph'
					);

				expect(
					anchorBlock.content
				).toEqual([
					{
						type: 'anchor',
						id: 'fn1'
					}
				]);
				expect(
					paragraph.content
				).toEqual([
					{
						type: 'word',
						text: 'KJV',
						href: [
							'#fn1'
						]
					}
				]);
			}
		);

		it(
			'does not let an unsupported wrapper id shift generated block ordinals',
			() => {
				const result =
					convertHtmlWithDiagnostics(
						`<custom-wrapper id="nd-v1-paragraph-1"><p>KJV</p></custom-wrapper>`
					);

				const paragraph =
					requireBlockType(
						result.document.blocks,
						0,
						'paragraph'
					);

				expect(
					paragraph.id
				).toBe(
					'nd-v1-paragraph-1'
				);
				expect(
					result.diagnostics.sourceIdsPreserved
				).toBe(
					0
				);
			}
		);

		it(
			'rejects normalized presentation on a transparent container rather than silently dropping it',
			() => {
				expect(
					() =>
						convertHtml(
							`<div class="text-center"><p>Text</p></div>`
						)
				).toThrow(
					'Cannot discard normalized presentation on container <div>: text-center.'
				);
			}
		);

		it(
			'ignores executable source nodes instead of preserving them as content',
			() => {
				const document =
					convertHtml(
						`<script>alert('no')</script><p>Safe</p><style>.x{}</style>`
					);

				expect(
					document.blocks
				).toHaveLength(
					1
				);

				const paragraph =
					requireBlockType(
						document.blocks,
						0,
						'paragraph'
					);

				expect(
					paragraph.content[0]
				).toMatchObject({
					type:
						'word',
					text:
						'Safe'
				});
			}
		);

		it(
			'treats the configured root as an extraction boundary rather than normalized content',
			() => {
				const document =
					convertHtml(
						`<main id="nd-v1-paragraph-1" class="text-center"><p>Text</p></main>`,
						{
							rootSelector:
								'main'
						}
					);

				expect(
					document.blocks
				).toMatchObject([
					{
						type:
							'paragraph',
						id:
							'nd-v1-paragraph-1'
					}
				]);
			}
		);

		it(
			'does not normalize block semantics carried by the extraction boundary itself',
			() => {
				const document =
					convertHtml(
						`<p id="selected" class="text-center"><strong>Text</strong></p>`,
						{
							rootSelector:
								'#selected'
						}
					);

				expect(
					document.blocks
				).toEqual([
					{
						type:
							'text',
						id:
							'nd-v1-text-1',
						content: [
							{
								type:
									'word',
								text:
									'Text',
								strong:
									true
							}
						]
					}
				]);
			}
		);

		it(
			'rejects contextual blocks at the document root during construction',
			() => {
				expect(
					() =>
						convertHtml(
							`<figcaption><p>KJV</p></figcaption>`
						)
				).toThrow(
					'HTML document root produced contextual child caption.'
				);
			}
		);

		it(
			'fails when a configured root cannot be found',
			() => {
				expect(
					() =>
						convertHtml(
							`<main><p>Text</p></main>`,
							{
								rootSelector:
									'#missing'
							}
						)
				).toThrow(
					'HTML root not found: #missing'
				);
			}
		);
	}
);

function requireBlock(
	blocks: readonly NormalizedBlock[],
	index: number
): NormalizedBlock {
	const block =
		blocks[index];

	if (!block) {
		throw new Error(
			`Expected normalized block at index ${index}.`
		);
	}

	return block;
}


function requireBlockType<
	TType extends NormalizedBlock['type']
>(
	blocks: readonly NormalizedBlock[],
	index: number,
	type: TType
): Extract<
	NormalizedBlock,
	{ type: TType }
> {
	const block =
		requireBlock(
			blocks,
			index
		);

	if (block.type !== type) {
		throw new Error(
			`Expected normalized block ${type} at index ${index}; received ${block.type}.`
		);
	}

	return block as Extract<
		NormalizedBlock,
		{ type: TType }
	>;
}

function collectBlockIds(
	blocks: readonly NormalizedBlock[]
): string[] {
	const ids:
		string[] = [];

	for (
		const block of blocks
	) {
		if (block.id) {
			ids.push(
				block.id
			);
		}

		if ('blocks' in block) {
			ids.push(
				...collectBlockIds(
					block.blocks
				)
			);
		}
	}

	return ids;
}
