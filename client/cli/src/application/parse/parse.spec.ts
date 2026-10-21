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
} from '@kjvonly/html-normalized-content';

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
						{ convertWithDiagnostics },
						{ convert: vi.fn() }
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


describe('legacy JSON parsing', () => {
    it('decodes JSON and delegates directly to the legacy converter without HTML parsing', () => {
        const document = { source: 'chs1.pdf', blocks: [] };
        const convert = vi.fn(() => document);
        const parseHtml = vi.fn();
        const parse = new ParseUseCase(
            { parse: parseHtml },
            { convertWithDiagnostics: vi.fn() },
            { convert }
        );
        const result = parse.run({
            format: 'legacy-normalized-document',
            content: JSON.stringify({ source: 'chs1.pdf', blocks: [] })
        });
        expect(convert).toHaveBeenCalledWith({ source: 'chs1.pdf', blocks: [] });
        expect(parseHtml).not.toHaveBeenCalled();
        expect(result.document).toEqual(document);
        expect(result.diagnostics).toMatchObject({
            blocksProduced: 0, wordsProduced: 0, idsGenerated: 0, warnings: []
        });
    });

    it('reports recursive block, word, linked-word, and preserved/generated ID counts', () => {
        const document: ParseResult['document'] = {
            source: 'chs1.pdf',
            blocks: [
                { type: 'paragraph', id: 'authored', content: [
                    { type: 'word', text: 'Jesus', href: ['/scripture'] },
                    { type: 'word', text: 'saves' }
                ] },
                { type: 'quote', id: 'nd-v1-quote-1', blocks: [
                    { type: 'text', id: 'nd-v1-text-1', content: [
                        { type: 'word', text: 'Grace' }
                    ] }
                ] }
            ]
        };
        const parse = new ParseUseCase(
            { parse: vi.fn() },
            { convertWithDiagnostics: vi.fn() },
            { convert: vi.fn(() => document) }
        );
        const result = parse.run({
            format: 'legacy-normalized-document',
            content: JSON.stringify({ blocks: [
                { id: 'authored', type: 'paragraph' },
                { id: null, type: 'quote', blocks: [{ id: null, type: 'text' }] }
            ] })
        });
        expect(result.diagnostics).toEqual({
            blocksProduced: 3, wordsProduced: 3, linkedWordsProduced: 1,
            sourceIdsPreserved: 1, idsGenerated: 2, warnings: []
        });
    });

    it('rejects invalid source JSON before attempting conversion', () => {
        const convert = vi.fn();
        const parse = new ParseUseCase(
            { parse: vi.fn() }, { convertWithDiagnostics: vi.fn() }, { convert }
        );
        expect(() => parse.run({ format: 'legacy-normalized-document', content: '{broken' })).toThrow();
        expect(convert).not.toHaveBeenCalled();
    });
});
