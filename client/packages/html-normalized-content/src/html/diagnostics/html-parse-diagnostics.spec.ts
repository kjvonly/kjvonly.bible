import {
	load
} from 'cheerio';

import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createHtmlParseDiagnostics
} from './html-parse-diagnostics.js';

function getRoot(
	html: string,
	selector = 'main'
): Element {
	const $ =
		load(
			html
		);

	const root =
		$(
			selector
		).get(
			0
		);

	if (!root) {
		throw new Error(
			`Missing test root: ${selector}`
		);
	}

	return root;
}


const allElementsSupported = {
	hasBlockProcessor:
		() => true,
	hasInlineProcessor:
		() => false,
	preservesInlinePresentation:
		() => true,
	preservesBlockSourceIdentity:
		() => true
};

describe(
	'createHtmlParseDiagnostics',
	() => {
		it(
			'counts normalized output and distinguishes preserved source ids from generated ids',
			() => {
				const root =
					getRoot(
						'<main><h1 id="title">Title</h1><p>Read <a href="/kjv/1_1_1">Genesis</a></p></main>'
					);

				const diagnostics =
					createHtmlParseDiagnostics(
						root,
						{
							blocks: [
								{
									type: 'heading',
									id: 'title',
									level: 1,
									content: [
										{
											type: 'word',
											text: 'Title'
										}
									]
								},
								{
									type: 'paragraph',
									id: 'nd-paragraph-test',
									content: [
										{
											type: 'word',
											text: 'Read'
										},
										{
											type: 'word',
											text: 'Genesis',
											href: [
												'/kjv/1_1_1'
											]
										}
									]
								}
							]
						},
						allElementsSupported
					);

				expect(
					diagnostics
				).toEqual({
					blocksProduced: 2,
					wordsProduced: 3,
					sourceIdsPreserved: 1,
					idsGenerated: 1,
					linkedWordsProduced: 1,
					warnings: []
				});
			}
		);

		it(
			'counts preserved inline anchor ids without treating them as generated block ids',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><p>KJV<span id="fn1"></span></p></main>'
						),
						{
							blocks: [
								{
									type: 'paragraph',
									id: 'nd-v1-paragraph-1',
									content: [
										{
											type: 'word',
											text: 'KJV'
										},
										{
											type: 'anchor',
											id: 'fn1'
										}
									]
								}
							]
						},
						allElementsSupported
					);

				expect(
					diagnostics
				).toMatchObject({
					blocksProduced: 1,
					wordsProduced: 1,
					sourceIdsPreserved: 1,
					idsGenerated: 1
				});
			}
		);

		it(
			'does not classify an extraction-boundary id as a preserved source id',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main id="nd-v1-paragraph-1"><p>Text</p></main>'
						),
						{
							blocks: [
								{
									type: 'paragraph',
									id: 'nd-v1-paragraph-1',
									content: [
										{
											type: 'word',
											text: 'Text'
										}
									]
								}
							],
						},
						allElementsSupported
					);

				expect(
					diagnostics.sourceIdsPreserved
				).toBe(
					0
				);

				expect(
					diagnostics.idsGenerated
				).toBe(
					1
				);
			}
		);

		it(
			'counts recursive child blocks',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><blockquote><p>Nested words</p></blockquote></main>'
						),
						{
							blocks: [
								{
									type: 'quote',
									id: 'nd-quote-test',
									blocks: [
										{
											type: 'paragraph',
											id: 'nd-paragraph-test',
											content: [
												{
													type: 'word',
													text: 'Nested'
												},
												{
													type: 'word',
													text: 'words'
												}
											]
										}
									]
								}
							],
						},
						allElementsSupported
					);

				expect(
					diagnostics.blocksProduced
				).toBe(
					2
				);
				expect(
					diagnostics.wordsProduced
				).toBe(
					2
				);
				expect(
					diagnostics.idsGenerated
				).toBe(
					2
				);
			}
		);

		it(
			'aggregates descendant warnings while excluding extraction-boundary metadata',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main class="text-center legacy legacy-two"><p class="legacy">Text</p><script>x()</script><style>.x{}</style></main>'
						),
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code: 'html-class-ignored',
						message: 'Ignored source HTML class "legacy".',
						count: 1
					},
					{
						code: 'html-element-ignored',
						message: 'Ignored source HTML element <script>.',
						count: 1
					},
					{
						code: 'html-element-ignored',
						message: 'Ignored source HTML element <style>.',
						count: 1
					}
				]);
			}
		);

		it(
			'reports unsupported and intentionally ignored boundaries without duplicating boundary metadata warnings',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><section class="legacy" data-source="publisher" style="font-weight:bold"><p>KJV</p></section><script class="legacy-script" data-source="publisher">x()</script></main>'
						),
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code:
							'html-element-ignored',
						message:
							'Ignored source HTML element <script class="legacy-script" data-source="publisher">.',
						count:
							1
					},
					{
						code:
							'html-element-unsupported',
						message:
							'Unsupported source HTML element <section class="legacy" data-source="publisher" style="font-weight:bold">; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
						count:
							1
					}
				]);
			}
		);

		it(
			'does not diagnose descendants inside an intentionally ignored source boundary',
			() => {
				const ignoredDescendant = {
					type: 'tag',
					name: 'section',
					attribs: {
						class: 'legacy'
					},
					children: []
				} as unknown as Element;

				const ignoredBoundary = {
					type: 'tag',
					name: 'template',
					attribs: {
						id: 'publisher-template'
					},
					children: [
						ignoredDescendant
					]
				} as unknown as Element;

				const root = {
					type: 'tag',
					name: 'main',
					attribs: {},
					children: [
						ignoredBoundary
					]
				} as unknown as Element;

				const diagnostics =
					createHtmlParseDiagnostics(
						root,
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code: 'html-element-ignored',
						message: 'Ignored source HTML element <template id="publisher-template">.',
						count: 1
					}
				]);
			}
		);

		it(
			'reports unsupported source styles on supported descendants without reporting represented or boundary styles',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main style="display:none"><p style="font-weight:bold">KJV</p><p style="font-weight:bold">Bible</p><p style="text-align:center">Centered</p><span style="font-style:italic">Text</span></main>'
						),
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code:
							'html-style-unsupported',
						message:
							'Unsupported source HTML style declaration "font-style:italic" on <span style="font-style:italic">; the element was normalized, but this declaration\'s presentation semantics were not preserved.',
						count:
							1
					},
					{
						code:
							'html-style-unsupported',
						message:
							'Unsupported source HTML style declaration "font-weight:bold" on <p style="font-weight:bold">; the element was normalized, but this declaration\'s presentation semantics were not preserved.',
						count:
							2
					}
				]);
			}
		);

		it(
			'reports presentation that a terminal inline processor cannot preserve',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><br class="text-center" style="text-align:center"></main>'
						),
						{
							blocks: []
						},
						{
							...allElementsSupported,
							hasInlineProcessor:
								tag => tag === 'br',
							preservesInlinePresentation:
								() => false
						}
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code: 'html-class-ignored',
						message: 'Ignored source HTML class "text-center".',
						count: 1
					},
					{
						code: 'html-style-unsupported',
						message: 'Unsupported source HTML style declaration "text-align:center" on <br class="text-center" style="text-align:center">; the element was normalized, but this declaration\'s presentation semantics were not preserved.',
						count: 1
					}
				]);
			}
		);

		it(
			'preserves every known source location when equivalent warnings are aggregated',
			() => {
				const root =
					getRoot(
						'<main><p class="legacy">One</p><p class="legacy">Two</p></main>'
					);

				let line =
					4;

				const diagnostics =
					createHtmlParseDiagnostics(
						root,
						{
							blocks: []
						},
						allElementsSupported,
						() => ({
							line:
								line++,
							column:
								3
						})
					);

				expect(
					diagnostics.warnings
				).toContainEqual({
					code:
						'html-class-ignored',
					message:
						'Ignored source HTML class "legacy".',
					count:
						2,
					sourceLocations: [
						{
							line:
								4,
							column:
								3
						},
						{
							line:
								5,
							column:
								3
						}
					]
				});
			}
		);

		it(
			'reports unconsumed attributes on supported elements without duplicating source metadata',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><ol type="I" data-source="kjv"><li>KJV</li></ol><p lang="en">Text</p></main>'
						),
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code:
							'html-attribute-unsupported',
						message:
							'Unsupported source HTML attribute "lang" on <p lang="en">; the element was normalized, but this attribute\'s semantics were not preserved.',
						count:
							1
					},
					{
						code:
							'html-attribute-unsupported',
						message:
							'Unsupported source HTML attribute "type" on <ol data-source="kjv" type="I">; the element was normalized, but this attribute\'s semantics were not preserved.',
						count:
							1
					}
				]);
			}
		);

		it.each([
			'thead',
			'tbody',
			'tfoot'
		])(
			'reports registered table section <%s> as unsupported semantic structure',
			(tag: string) => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							`<main><table><${tag}><tr><td>KJV</td></tr></${tag}></table></main>`
						),
						{
							blocks: []
						},
						allElementsSupported
					);

				expect(
					diagnostics.warnings
				).toContainEqual({
					code:
						'html-element-unsupported',
					message:
						`Unsupported source HTML element <${tag}>; descendant content was preserved where representable, but this element's semantics were not normalized.`,
					count:
						1
				});
			}
		);

		it(
			'includes unsupported element attributes while keeping the diagnostic non-fatal',
			() => {
				const diagnostics =
					createHtmlParseDiagnostics(
						getRoot(
							'<main><p>Written <time datetime="2026-10-04" data-source="publisher">today</time>.</p><img alt="Publisher logo"></main>'
						),
						{
							blocks: []
						},
						{
							hasBlockProcessor:
								tag =>
									tag === 'p',
							hasInlineProcessor:
								() => false,
							preservesBlockSourceIdentity:
								() => true
						}
					);

				expect(
					diagnostics.warnings
				).toEqual([
					{
						code: 'html-element-unsupported',
						message: 'Unsupported source HTML element <img alt="Publisher logo">; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
						count: 1
					},
					{
						code: 'html-element-unsupported',
						message: 'Unsupported source HTML element <time data-source="publisher" datetime="2026-10-04">; descendant content was preserved where representable, but this element\'s semantics were not normalized.',
						count: 1
					}
				]);
			}
		);

	}
);
