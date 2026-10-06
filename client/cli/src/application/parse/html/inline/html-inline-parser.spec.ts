import {
	load
} from 'cheerio';

import type {
	AnyNode,
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	HtmlInlineParser
} from './html-inline-parser.js';

import {
	HtmlInlineProcessorRegistry
} from './html-inline-processor-registry.js';

import {
	createHtmlInlineState
} from './html-inline-state.js';

import {
	AnchorInlineProcessor
} from './processors/anchor-inline-processor.js';

import {
	EmphasisInlineProcessor
} from './processors/emphasis-inline-processor.js';

import {
	LineBreakInlineProcessor
} from './processors/line-break-inline-processor.js';

import {
	MarkInlineProcessor
} from './processors/mark-inline-processor.js';

import {
	StrongInlineProcessor
} from './processors/strong-inline-processor.js';

const parser =
	new HtmlInlineParser(
		createDefaultInlineProcessorRegistry(),
		tag =>
			[
				'p',
				'blockquote',
				'ol',
				'ul'
			].includes(
				tag
			)
	);

describe(
	'HtmlInlineParser',
	() => {
		it(
			'tokenizes whitespace and non-breaking spaces into deterministic word units',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'  Alpha\u00a0  Bravo\nCharlie  '
						)
					)
				).toEqual([
					word(
						'Alpha'
					),
					word(
						'Bravo'
					),
					word(
						'Charlie'
					)
				]);
			}
		);

		it(
			'preserves lexical continuity across inline semantic boundaries',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'pre<strong>fix</strong> word<sup>1</sup>!'
						)
					)
				).toEqual([
					word(
						'pre'
					),
					{
						...word(
							'fix'
						),
						joinPrevious:
							true,
						strong:
							true
					},
					word(
						'word'
					),
					{
						...word(
							'1'
						),
						joinPrevious:
							true,
						marks: [
							'superscript'
						]
					},
					{
						...word(
							'!'
						),
						joinPrevious:
							true
					}
				]);
			}
		);

		it(
			'merges DOM fragments when no whitespace or semantic boundary separates them',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<span>pre</span>fix <strong>bo</strong><strong>ld</strong>'
						)
					)
				).toEqual([
					word(
						'prefix'
					),
					{
						...word(
							'bold'
						),
						strong:
							true
					}
				]);
			}
		);

		it(
			'keeps source whitespace as an ordinary separator across inline boundaries',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'pre <strong>fix</strong> next<strong> value</strong>'
						)
					)
				).toEqual([
					word(
						'pre'
					),
					{
						...word(
							'fix'
						),
						strong:
							true
					},
					word(
						'next'
					),
					{
						...word(
							'value'
						),
						strong:
							true
					}
				]);
			}
		);

		it(
			'preserves source newlines only in preformatted mode',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'Alpha\nBravo\n\nCharlie'
						),
						{
							preservePreformattedSourceNewlines:
								true
						}
					)
				).toEqual([
					word(
						'Alpha'
					),
					{
						type:
							'line-break'
					},
					word(
						'Bravo'
					),
					{
						type:
							'line-break'
					},
					{
						type:
							'line-break'
					},
					word(
						'Charlie'
					)
				]);
			}
		);

		it(
			'preserves preformatted line structure without preserving exact whitespace',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'\n  Alpha   Bravo\n\tCharlie\n'
						),
						{
							preservePreformattedSourceNewlines:
								true
						}
					)
				).toEqual([
					word(
						'Alpha'
					),
					word(
						'Bravo'
					),
					{
						type:
							'line-break'
					},
					word(
						'Charlie'
					)
				]);
			}
		);

		it(
			'applies nested decorator semantics without leaking them to following siblings',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<strong>Bold <em>Both</em></strong> Plain'
						)
					)
				).toEqual([
					{
						...word(
							'Bold'
						),
						strong:
							true
					},
					{
						...word(
							'Both'
						),
						emphasis:
							true,
						strong:
							true
					},
					word(
						'Plain'
					)
				]);
			}
		);

		it(
			'preserves links and controlled normalized classes on emitted words',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<a href="#note"><span class="text-center publisher-only">Linked</span></a>'
						)
					)
				).toEqual([
					{
						...word(
							'Linked'
						),
						class: [
							'text-center'
						],
						href: [
							'#note'
						]
					}
				]);
			}
		);

		it(
			'creates descendant context for structural traversal without mutating inherited semantics',
			() => {
				const inheritedState =
					createHtmlInlineState();

				inheritedState.strong =
					true;

				const descendantContext =
					parser.createDescendantInlineContext(
						element(
							'<a href="/kjv/1_1_1"></a>',
							'a'
						),
						inheritedState
					);

				expect(
					descendantContext.state
				).toMatchObject({
					strong: true,
					hrefs: [
						'/kjv/1_1_1'
					]
				});

				expect(
					descendantContext.leadingContent
				).toEqual([]);

				expect(
					inheritedState.hrefs
				).toEqual([]);
			}
		);

		it.each([
			[
				'sup',
				'superscript'
			],
			[
				'sub',
				'subscript'
			],
			[
				'u',
				'underline'
			],
			[
				'del',
				'strikethrough'
			],
			[
				's',
				'strikethrough'
			],
			[
				'strike',
				'strikethrough'
			],
			[
				'small',
				'small'
			],
			[
				'code',
				'code'
			],
			[
				'mark',
				'highlight'
			]
		])(
			'maps <%s> to normalized mark %s',
			(
				tag: string,
				mark: string
			) => {
				expect(
					parser.parseNodes(
						nodes(
							`<${tag}>Text</${tag}>`
						)
					)
				).toEqual([
					{
						...word(
							'Text'
						),
						marks: [
							mark
						]
					}
				]);
			}
		);

		it(
			'preserves explicit br line breaks at inline-content boundaries',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<br>Alpha<br>Bravo<br>'
						)
					)
				).toEqual([
					{
						type:
							'line-break'
					},
					word(
						'Alpha'
					),
					{
						type:
							'line-break'
					},
					word(
						'Bravo'
					),
					{
						type:
							'line-break'
					}
				]);
			}
		);

		it(
			'trims preformatted source-newline boundaries without trimming explicit br',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'\n<br>Alpha<br>\n'
						),
						{
							preservePreformattedSourceNewlines:
								true
						}
					)
				).toEqual([
					{
						type:
							'line-break'
					},
					word(
						'Alpha'
					),
					{
						type:
							'line-break'
					}
				]);
			}
		);

		it(
			'recurses through an explicitly neutral inline wrapper',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<span>Wrapped</span>'
						)
					)
				).toEqual([
					word(
						'Wrapped'
					)
				]);
			}
		);

		it.each([
			[
				'<abbr title="King James Version">KJV</abbr>',
				'KJV'
			],
			[
				'<time datetime="2026-10-03">today</time>',
				'today'
			],
			[
				'<q>quoted</q>',
				'quoted'
			],
			[
				'<custom-inline data-kind="future">Wrapped</custom-inline>',
				'Wrapped'
			]
		])(
			'preserves descendant text from an unsupported inline element: %s',
			(html, text) => {
				expect(
					parser.parseNodes(
						nodes(
							html
						)
					)
				).toEqual([
					word(
						text
					)
				]);
			}
		);

		it(
			'preserves unsupported inline descendants even when the wrapper has an id',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<custom-inline id="legacy-inline">Wrapped</custom-inline>'
						)
					)
				).toEqual([
					word(
						'Wrapped'
					)
				]);
			}
		);

		it(
			'ignores script, style, noscript, and template content',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<script>bad()</script><style>.x{}</style><noscript>bad</noscript><template>bad</template>Safe'
						)
					)
				).toEqual([
					word(
						'Safe'
					)
				]);
			}
		);

		it(
			'preserves a supported inline source id as a zero-width anchor',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'<span id="anchor">KJV</span>'
						)
					)
				).toEqual([
					{
						type: 'anchor',
						id: 'anchor'
					},
					word(
						'KJV'
					)
				]);
			}
		);

		it(
			'preserves lexical continuity across a zero-width inline anchor',
			() => {
				expect(
					parser.parseNodes(
						nodes(
							'K<span id="kjv-anchor"></span>JV'
						)
					)
				).toEqual([
					word(
						'K'
					),
					{
						type: 'anchor',
						id: 'kjv-anchor'
					},
					{
						...word(
							'JV'
						),
						joinPrevious: true
					}
				]);
			}
		);

		it(
			'rejects a structural element encountered during inline traversal',
			() => {
				expect(
					() =>
						parser.parseNodes(
							children(
								'<div><p>Block</p></div>',
								'div'
							)
						)
				).toThrow(
					'Block element <p> cannot be normalized inside inline content.'
				);
			}
		);
	}
);

function nodes(
	html: string
): AnyNode[] {
	return children(
		`<div>${html}</div>`,
		'div'
	);
}

function children(
	html: string,
	selector: string
): AnyNode[] {
	return element(
		html,
		selector
	).children;
}

function element(
	html: string,
	selector: string
): Element {
	const $ =
		load(
			html
		);

	const value =
		$(
			selector
		).get(
			0
		);

	if (!value) {
		throw new Error(
			`Expected element ${selector}.`
		);
	}

	return value;
}

function word(
	text: string
): {
	type: 'word';
	text: string;
} {
	return {
		type:
			'word',
		text
	};
}
function createDefaultInlineProcessorRegistry():
	HtmlInlineProcessorRegistry {
	return new HtmlInlineProcessorRegistry([
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
}
