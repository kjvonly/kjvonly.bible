import {
	describe,
	expect,
	it
} from 'vitest';

import {
	CheerioHtmlParser
} from './cheerio-html-parser.js';

const parser =
	new CheerioHtmlParser();

describe(
	'CheerioHtmlParser',
	() => {
		it(
			'parses fragments into an HTML document with an implicit body',
			() => {
				const document =
					parser.parse(
						'<p>Hello</p>'
					);

				const body =
					document.selectFirst(
						'body'
					);

				expect(
					body?.name
				).toBe(
					'body'
				);

				expect(
					document.selectFirst(
						'body > p'
					)?.children[0]
				).toMatchObject({
					type:
						'text',
					data:
						'Hello'
				});
			}
		);

		it(
			'recovers omitted closing tags using HTML parsing rules',
			() => {
				const document =
					parser.parse(
						'<main><p>One<p>Two</main>'
					);

				expect(
					document.selectFirst(
						'main > p:first-child'
					)?.children[0]
				).toMatchObject({
					type:
						'text',
					data:
						'One'
				});

				expect(
					document.selectFirst(
						'main > p:nth-child(2)'
					)?.children[0]
				).toMatchObject({
					type:
						'text',
					data:
						'Two'
				});
			}
		);

		it(
			'decodes entities and preserves element attributes on parsed nodes',
			() => {
				const document =
					parser.parse(
						'<p id="intro" data-kind="lead">Tom &amp; Jerry</p>'
					);

				const paragraph =
					document.selectFirst(
						'#intro'
					);

				expect(
					paragraph?.attribs
				).toMatchObject({
					id:
						'intro',
					'data-kind':
						'lead'
				});

				expect(
					paragraph?.children[0]
				).toMatchObject({
					type:
						'text',
					data:
						'Tom & Jerry'
				});
			}
		);

		it(
			'exposes authored opening-tag line and column coordinates without leaking parse5 metadata',
			() => {
				const document =
					parser.parse(
						'<main>\n  <p id="target">KJV</p>\n</main>'
					);

				const paragraph =
					document.selectFirst(
						'#target'
					);

				if (!paragraph) {
					throw new Error(
						'Missing test paragraph.'
					);
				}

				expect(
					document.getSourceLocation(
						paragraph
					)
				).toEqual({
					line:
						2,
					column:
						3
				});
			}
		);

		it(
			'returns no source coordinates for parser-inserted recovery elements',
			() => {
				const document =
					parser.parse(
						'<table><tr><td>KJV</td></tr></table>'
					);

				const tableBody =
					document.selectFirst(
						'tbody'
					);

				if (!tableBody) {
					throw new Error(
						'Missing parser-inserted tbody.'
					);
				}

				expect(
					document.getSourceLocation(
						tableBody
					)
				).toBeUndefined();
			}
		);

		it(
			'returns undefined when no element matches the requested selector',
			() => {
				const document =
					parser.parse(
						'<main></main>'
					);

				expect(
					document.selectFirst(
						'article'
					)
				).toBeUndefined();
			}
		);
	}
);
