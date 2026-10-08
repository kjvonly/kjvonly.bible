import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ParseResult
} from './diagnostics/parse-diagnostics.js';

import type {
	ParsedHtmlDocument
} from './html/parser/html-parser.js';

import {
	ParseUseCase
} from './parse.js';

describe(
	'ParseUseCase',
	() => {
		it(
			'parses HTML syntax before delegating semantic normalization and diagnostics',
			() => {
				const parseResult:
					ParseResult = {
						document: {
							blocks: []
						},
						diagnostics: {
							blocksProduced: 0,
							wordsProduced: 0,
							sourceIdsPreserved: 0,
							idsGenerated: 0,
							linkedWordsProduced: 0,
							warnings: []
						}
					};

				const parsedDocument:
					ParsedHtmlDocument = {
						selectFirst:
							vi.fn(),
						getSourceLocation:
							vi.fn()
					};

				const parseHtml =
					vi.fn(
						() => parsedDocument
					);

				const convertWithDiagnostics =
					vi.fn(
						() => parseResult
					);

				const parse =
					new ParseUseCase(
						{
							parse:
								parseHtml
						},
						{
							convertWithDiagnostics
						}
					);

				const sourceHtml =
					'<main><p>Hello</p></main>';

				const result =
					parse.run({
						format:
							'html',
						content:
							sourceHtml,
						rootSelector:
							'main',
						source:
							'sermon.html'
					});

				expect(
					result
				).toBe(
					parseResult
				);

				expect(
					parseHtml
				).toHaveBeenCalledOnce();

				expect(
					parseHtml
				).toHaveBeenCalledWith(
					sourceHtml
				);

				expect(
					convertWithDiagnostics
				).toHaveBeenCalledOnce();

				expect(
					convertWithDiagnostics
				).toHaveBeenCalledWith(
					parsedDocument,
					{
						rootSelector:
							'main',
						source:
							'sermon.html'
					}
				);
			}
		);
	}
);
