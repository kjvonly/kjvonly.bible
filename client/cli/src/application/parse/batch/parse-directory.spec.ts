import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	ParseDirectoryUseCase
} from './parse-directory.js';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import type {
	ParseDiagnostics,
	ParseResult
} from '../diagnostics/parse-diagnostics.js';


const EMPTY_DIAGNOSTICS:
	ParseDiagnostics = {
		blocksProduced: 0,
		wordsProduced: 0,
		sourceIdsPreserved: 0,
		idsGenerated: 0,
		linkedWordsProduced: 0,
		warnings: []
	};

function createParseResult(
	document: NormalizedDocument,
	diagnostics:
		ParseDiagnostics = EMPTY_DIAGNOSTICS
): ParseResult {
	return {
		document,
		diagnostics
	};
}

function createWorkspace() {
	return {
		findSourceFiles:
			vi.fn(),
		resolveDestinationOutputPath:
			vi.fn(
				(outputDirectory: string, relativeOutputPath: string) =>
					`${outputDirectory}/${relativeOutputPath}`
			),
		getPathCollisionKey:
			vi.fn(
				(path: string) =>
					path
			),
		pathExists:
			vi.fn(),
		readTextFile:
			vi.fn(),
		writeOutputAtomically:
			vi.fn()
	};
}

describe(
	'ParseDirectoryUseCase',
	() => {
		it(
			'writes destination .nd.json files preserving relative hierarchy and document provenance',
			async () => {
				const workspace = createWorkspace();
				workspace.pathExists.mockResolvedValue(false);
				workspace.findSourceFiles.mockResolvedValue([
					{ path: '/original/01_Genesis/one.cfm', relativePath: '01_Genesis/one.cfm' },
					{ path: '/original/02_Exodus/two.HTM', relativePath: '02_Exodus/two.HTM' }
				]);
				workspace.readTextFile.mockResolvedValue('<p>Text</p>');
				const run = vi.fn()
					.mockReturnValueOnce(createParseResult({ source: '01_Genesis/one.cfm', blocks: [] }))
					.mockReturnValueOnce(createParseResult({ source: '02_Exodus/two.HTM', blocks: [] }));
				const result = await new ParseDirectoryUseCase({ run }, workspace).run({
					format: 'html',
					directory: '/original',
					outputDirectory: '/normalized',
					rootSelector: '#commentary'
				});

				expect(workspace.resolveDestinationOutputPath).toHaveBeenNthCalledWith(
					1, '/normalized', '01_Genesis/one.nd.json'
				);
				expect(workspace.resolveDestinationOutputPath).toHaveBeenNthCalledWith(
					2, '/normalized', '02_Exodus/two.nd.json'
				);
				expect(run).toHaveBeenNthCalledWith(1, {
					format: 'html', content: '<p>Text</p>', rootSelector: '#commentary',
					source: '01_Genesis/one.cfm'
				});
				expect(run).toHaveBeenNthCalledWith(2, {
					format: 'html', content: '<p>Text</p>', rootSelector: '#commentary',
					source: '02_Exodus/two.HTM'
				});
				expect(workspace.writeOutputAtomically).toHaveBeenNthCalledWith(
					1, '/normalized/01_Genesis/one.nd.json',
					`${JSON.stringify({ source: '01_Genesis/one.cfm', blocks: [] }, null, 2)}\n`,
					{ overwrite: false }
				);
				expect(workspace.writeOutputAtomically).toHaveBeenNthCalledWith(
					2, '/normalized/02_Exodus/two.nd.json',
					`${JSON.stringify({ source: '02_Exodus/two.HTM', blocks: [] }, null, 2)}\n`,
					{ overwrite: false }
				);
				expect(result).toMatchObject({
					total: 2, converted: 2, failed: 0,
					outputs: [
						{ sourcePath: '/original/01_Genesis/one.cfm', outputPath: '/normalized/01_Genesis/one.nd.json' },
						{ sourcePath: '/original/02_Exodus/two.HTM', outputPath: '/normalized/02_Exodus/two.nd.json' }
					]
				});
			}
		);

		it(
			'preflights protected destination outputs and ambiguous destination names',
			async () => {
				const workspace = createWorkspace();
				workspace.findSourceFiles.mockResolvedValue([
					{ path: '/sources/duplicate.cfm', relativePath: 'duplicate.cfm' },
					{ path: '/sources/duplicate.html', relativePath: 'duplicate.html' },
					{ path: '/sources/existing.html', relativePath: 'existing.html' },
					{ path: '/sources/valid.cfm', relativePath: 'valid.cfm' }
				]);
				workspace.pathExists.mockImplementation(async (path: string) =>
					path === '/dest/existing.nd.json'
				);
				workspace.readTextFile.mockResolvedValue('<p>Text</p>');
				const run = vi.fn().mockReturnValue(createParseResult({ blocks: [] }));
				const result = await new ParseDirectoryUseCase({ run }, workspace).run({
					format: 'html', directory: '/sources', outputDirectory: '/dest'
				});

				expect(result).toMatchObject({ total: 4, converted: 1, failed: 3 });
				expect(result.failures.map(failure => failure.sourcePath)).toEqual([
					'/sources/duplicate.cfm', '/sources/duplicate.html', '/sources/existing.html'
				]);
				expect(result.failures[0]?.message).toContain('Output path collision');
				expect(result.failures[2]?.message).toContain('/dest/existing.nd.json');
				expect(run).toHaveBeenCalledOnce();
				expect(workspace.writeOutputAtomically).toHaveBeenCalledWith(
					'/dest/valid.nd.json', expect.any(String), { overwrite: false }
				);
			}
		);

		it(
			'discovers supported HTML-family files and writes normalized JSON beside each source',
			async () => {
				const workspace =
					createWorkspace();

				workspace.pathExists.mockResolvedValue(
					false
				);

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/a.html',
						relativePath: 'a.html'
					},
					{
						path: '/docs/nested/b.cfm',
						relativePath: 'nested/b.cfm'
					}
				]);

				workspace.readTextFile
					.mockResolvedValueOnce(
						'<main><p>A</p></main>'
					)
					.mockResolvedValueOnce(
						'<main><p>B</p></main>'
					);

				const firstDocument:
					NormalizedDocument = {
						blocks: []
					};

				const secondDocument:
					NormalizedDocument = {
						source:
							'nested/b.cfm',
						blocks: []
					};

				const run =
					vi.fn()
						.mockReturnValueOnce(
							createParseResult(
								firstDocument
							)
						)
						.mockReturnValueOnce(
							createParseResult(
								secondDocument,
								{
									blocksProduced: 1,
									wordsProduced: 2,
									sourceIdsPreserved: 1,
									idsGenerated: 0,
									linkedWordsProduced: 0,
									warnings: []
								}
							)
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs',
						rootSelector:
							'main'
					});

				expect(
					workspace.findSourceFiles
				).toHaveBeenCalledWith(
					'/docs',
					[
						'.cfm',
						'.htm',
						'.html'
					]
				);

				expect(
					run
				).toHaveBeenNthCalledWith(
					1,
					{
						format:
							'html',
						content:
							'<main><p>A</p></main>',
						rootSelector:
							'main',
						source:
							'a.html'
					}
				);

				expect(
					run
				).toHaveBeenNthCalledWith(
					2,
					{
						format:
							'html',
						content:
							'<main><p>B</p></main>',
						rootSelector:
							'main',
						source:
							'nested/b.cfm'
					}
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenNthCalledWith(
					1,
					'/docs/a.json',
					`${JSON.stringify(
						firstDocument,
						null,
						2
					)}\n`,
					{
						overwrite:
							false
					}
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenNthCalledWith(
					2,
					'/docs/nested/b.json',
					`${JSON.stringify(
						secondDocument,
						null,
						2
					)}\n`,
					{
						overwrite:
							false
					}
				);

				expect(
					result
				).toEqual({
					total:
						2,
					converted:
						2,
					failed:
						0,
					outputs: [
						{
							sourcePath:
								'/docs/a.html',
							outputPath:
								'/docs/a.json',
							diagnostics:
								EMPTY_DIAGNOSTICS
						},
						{
							sourcePath:
								'/docs/nested/b.cfm',
							outputPath:
								'/docs/nested/b.json',
							diagnostics: {
								blocksProduced: 1,
								wordsProduced: 2,
								sourceIdsPreserved: 1,
								idsGenerated: 0,
								linkedWordsProduced: 0,
								warnings: []
							}
						}
					],
					failures: []
				});
			}
		);

		it(
			'continues parsing remaining files when one source fails',
			async () => {
				const workspace =
					createWorkspace();

				workspace.pathExists.mockResolvedValue(
					false
				);

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/bad.html',
						relativePath: 'bad.html'
					},
					{
						path: '/docs/good.html',
						relativePath: 'good.html'
					}
				]);

				workspace.readTextFile
					.mockResolvedValueOnce(
						'<p>Bad</p>'
					)
					.mockResolvedValueOnce(
						'<p>Good</p>'
					);

				const run =
					vi.fn()
						.mockImplementationOnce(
							() => {
								throw new Error(
									'Synthetic parse failure.'
								);
							}
						)
						.mockReturnValueOnce(
							createParseResult({
								blocks: []
							})
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs'
					});

				expect(
					run
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenCalledOnce();

				expect(
					result
				).toEqual({
					total:
						2,
					converted:
						1,
					failed:
						1,
					outputs: [
						{
							sourcePath:
								'/docs/good.html',
							outputPath:
								'/docs/good.json',
							diagnostics:
								EMPTY_DIAGNOSTICS
						}
					],
					failures: [
						{
							sourcePath:
								'/docs/bad.html',
							message:
								'Synthetic parse failure.'
						}
					]
				});
			}
		);

		it(
			'rejects output collisions even with overwrite enabled and preserves non-colliding sources',
			async () => {
				const workspace =
					createWorkspace();

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/kjv.html',
						relativePath: 'kjv.html'
					},
					{
						path: '/docs/kjv.htm',
						relativePath: 'kjv.htm'
					},
					{
						path: '/docs/sermon.html',
						relativePath: 'sermon.html'
					}
				]);

				workspace.readTextFile.mockResolvedValue(
					'<p>Sermon</p>'
				);

				const run =
					vi.fn()
						.mockReturnValue(
							createParseResult({
								blocks: []
							})
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs',
						overwrite:
							true
					});

				expect(
					workspace.pathExists
				).not.toHaveBeenCalled();

				expect(
					workspace.readTextFile
				).toHaveBeenCalledOnce();

				expect(
					workspace.readTextFile
				).toHaveBeenCalledWith(
					'/docs/sermon.html'
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenCalledWith(
					'/docs/sermon.json',
					`${JSON.stringify(
						{
							blocks: []
						},
						null,
						2
					)}\n`,
					{
						overwrite:
							true
					}
				);

				expect(
					result
				).toEqual({
					total:
						3,
					converted:
						1,
					failed:
						2,
					outputs: [
						{
							sourcePath:
								'/docs/sermon.html',
							outputPath:
								'/docs/sermon.json',
							diagnostics:
								EMPTY_DIAGNOSTICS
						}
					],
					failures: [
						{
							sourcePath:
								'/docs/kjv.html',
							message:
								'Output path collision: /docs/kjv.html, /docs/kjv.htm all map to /docs/kjv.json.'
						},
						{
							sourcePath:
								'/docs/kjv.htm',
							message:
								'Output path collision: /docs/kjv.html, /docs/kjv.htm all map to /docs/kjv.json.'
						}
					]
				});
			}
		);

		it(
			'rejects case-equivalent output paths without rewriting emitted filenames',
			async () => {
				const workspace =
					createWorkspace();

				workspace.getPathCollisionKey.mockImplementation(
					(path: string) =>
						path.toLowerCase()
				);

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/KJV.html',
						relativePath: 'KJV.html'
					},
					{
						path: '/docs/kjv.htm',
						relativePath: 'kjv.htm'
					},
					{
						path: '/docs/Sermon.html',
						relativePath: 'Sermon.html'
					}
				]);

				workspace.readTextFile.mockResolvedValue(
					'<p>Sermon</p>'
				);

				const run =
					vi.fn()
						.mockReturnValue(
							createParseResult({
								blocks: []
							})
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs',
						overwrite:
							true
					});

				expect(
					workspace.getPathCollisionKey
				).toHaveBeenCalledWith(
					'/docs/KJV.json'
				);

				expect(
					workspace.getPathCollisionKey
				).toHaveBeenCalledWith(
					'/docs/kjv.json'
				);

				expect(
					workspace.readTextFile
				).toHaveBeenCalledOnce();

				expect(
					workspace.readTextFile
				).toHaveBeenCalledWith(
					'/docs/Sermon.html'
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenCalledWith(
					'/docs/Sermon.json',
					`${JSON.stringify(
						{
							blocks: []
						},
						null,
						2
					)}\n`,
					{
						overwrite:
							true
					}
				);

				expect(
					result.failures
				).toEqual([
					{
						sourcePath:
							'/docs/KJV.html',
						message:
							'Output path collision: /docs/KJV.html, /docs/kjv.htm map to filesystem-equivalent output paths: /docs/KJV.json, /docs/kjv.json.'
					},
					{
						sourcePath:
							'/docs/kjv.htm',
						message:
							'Output path collision: /docs/KJV.html, /docs/kjv.htm map to filesystem-equivalent output paths: /docs/KJV.json, /docs/kjv.json.'
					}
				]);
			}
		);

		it(
			'preflights existing outputs before writing any safe source',
			async () => {
				const workspace =
					createWorkspace();

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/existing.html',
						relativePath: 'existing.html'
					},
					{
						path: '/docs/new.html',
						relativePath: 'new.html'
					}
				]);

				workspace.pathExists.mockImplementation(
					async (
						path: string
					) => {
						expect(
							workspace.writeOutputAtomically
						).not.toHaveBeenCalled();

						return path ===
							'/docs/existing.json';
					}
				);

				workspace.readTextFile.mockResolvedValue(
					'<p>New</p>'
				);

				const run =
					vi.fn()
						.mockReturnValue(
							createParseResult({
								blocks: []
							})
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs'
					});

				expect(
					workspace.pathExists
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					workspace.readTextFile
				).toHaveBeenCalledOnce();

				expect(
					workspace.readTextFile
				).toHaveBeenCalledWith(
					'/docs/new.html'
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenCalledWith(
					'/docs/new.json',
					`${JSON.stringify(
						{
							blocks: []
						},
						null,
						2
					)}\n`,
					{
						overwrite:
							false
					}
				);

				expect(
					result.failures
				).toEqual([
					{
						sourcePath:
							'/docs/existing.html',
						message:
							'Output already exists: /docs/existing.json. Existing outputs are not replaced unless overwrite is enabled.'
					}
				]);
			}
		);

		it(
			'reports a final publication race even after a successful non-overwrite preflight',
			async () => {
				const workspace =
					createWorkspace();

				workspace.findSourceFiles.mockResolvedValue([
					{
						path: '/docs/race.html',
						relativePath: 'race.html'
					}
				]);

				workspace.pathExists.mockResolvedValue(
					false
				);

				workspace.readTextFile.mockResolvedValue(
					'<p>Race</p>'
				);

				workspace.writeOutputAtomically.mockRejectedValue(
					Object.assign(
						new Error(
							'Output appeared before final publication.'
						),
						{
							code:
								'EEXIST'
						}
					)
				);

				const run =
					vi.fn()
						.mockReturnValue(
							createParseResult({
								blocks: []
							})
						);

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/docs'
					});

				expect(
					workspace.pathExists
				).toHaveBeenCalledWith(
					'/docs/race.json'
				);

				expect(
					workspace.writeOutputAtomically
				).toHaveBeenCalledWith(
					'/docs/race.json',
					`${JSON.stringify(
						{
							blocks: []
						},
						null,
						2
					)}\n`,
					{
						overwrite:
							false
					}
				);

				expect(
					result
				).toEqual({
					total:
						1,
					converted:
						0,
					failed:
						1,
					outputs: [],
					failures: [
						{
							sourcePath:
								'/docs/race.html',
							message:
								'Output appeared before final publication.'
						}
					]
				});
			}
		);

		it(
			'reports zero work for an empty source directory',
			async () => {
				const workspace =
					createWorkspace();

				workspace.findSourceFiles.mockResolvedValue(
					[]
				);

				const run =
					vi.fn();

				const useCase =
					new ParseDirectoryUseCase(
						{
							run
						},
						workspace
					);

				const result =
					await useCase.run({
						format:
							'html',
						directory:
							'/empty'
					});

				expect(
					run
				).not.toHaveBeenCalled();

				expect(
					result
				).toEqual({
					total:
						0,
					converted:
						0,
					failed:
						0,
					outputs: [],
					failures: []
				});
			}
		);
	}
);

describe('legacy normalized-document directory migration', () => {
    it('processes legacy .json recursively, preserves PDF provenance, and leaves inputs untouched', async () => {
        const workspace = createWorkspace();
        workspace.findSourceFiles.mockResolvedValue([
            { path: '/legacy/vol1/chs1.json', relativePath: 'vol1/chs1.json' },
            { path: '/legacy/vol2/chs2.JSON', relativePath: 'vol2/chs2.JSON' },
            { path: '/legacy/canonical.nd.json', relativePath: 'canonical.nd.json' }
        ]);
        workspace.pathExists.mockResolvedValue(false);
        workspace.readTextFile.mockResolvedValue('{"source":"chs1.pdf","blocks":[]}');
        const run = vi.fn().mockReturnValue(createParseResult({ source: 'chs1.pdf', blocks: [] }));
        const result = await new ParseDirectoryUseCase({ run }, workspace).run({
            format: 'legacy-normalized-document',
            directory: '/legacy',
            outputDirectory: '/app-files/Spurgeon'
        });
        expect(workspace.findSourceFiles).toHaveBeenCalledWith('/legacy', ['.json']);
        expect(workspace.resolveDestinationOutputPath.mock.calls).toEqual([
            ['/app-files/Spurgeon', 'vol1/chs1.nd.json'],
            ['/app-files/Spurgeon', 'vol2/chs2.nd.json']
        ]);
        expect(run).toHaveBeenCalledTimes(2);
        expect(run).toHaveBeenCalledWith({
            format: 'legacy-normalized-document',
            content: '{"source":"chs1.pdf","blocks":[]}'
        });
        expect(workspace.writeOutputAtomically).toHaveBeenCalledTimes(2);
        expect(workspace.writeOutputAtomically).toHaveBeenCalledWith(
            '/app-files/Spurgeon/vol1/chs1.nd.json',
            '{\n  "source": "chs1.pdf",\n  "blocks": []\n}\n',
            { overwrite: false }
        );
        expect(result).toMatchObject({ total: 2, converted: 2, failed: 0 });
        expect(result.outputs.map(output => output.outputPath)).toEqual([
            '/app-files/Spurgeon/vol1/chs1.nd.json',
            '/app-files/Spurgeon/vol2/chs2.nd.json'
        ]);
    });

    it('requires a separate output root before reading or writing source files', async () => {
        const workspace = createWorkspace();
        const run = vi.fn();
        await expect(new ParseDirectoryUseCase({ run }, workspace).run({
            format: 'legacy-normalized-document', directory: '/legacy'
        })).rejects.toThrow('requires --output-dir');
        expect(workspace.findSourceFiles).not.toHaveBeenCalled();
        expect(workspace.writeOutputAtomically).not.toHaveBeenCalled();
    });

    it('blocks existing outputs by default and continues after invalid legacy JSON', async () => {
        const workspace = createWorkspace();
        workspace.findSourceFiles.mockResolvedValue([
            { path: '/old/a.json', relativePath: 'a.json' },
            { path: '/old/b.json', relativePath: 'b.json' },
            { path: '/old/c.json', relativePath: 'c.json' }
        ]);
        workspace.pathExists.mockImplementation(async (path: string) => path === '/new/a.nd.json');
        workspace.readTextFile.mockImplementation(async (path: string) => path.endsWith('b.json') ? '{bad' : '{}');
        const run = vi.fn().mockImplementation(({ content }: { content: string }) => {
            JSON.parse(content);
            return createParseResult({ blocks: [] });
        });
        const result = await new ParseDirectoryUseCase({ run }, workspace).run({
            format: 'legacy-normalized-document', directory: '/old', outputDirectory: '/new'
        });
        expect(result).toMatchObject({ total: 3, converted: 1, failed: 2 });
        expect(result.failures[0]?.message).toContain('Output already exists');
        expect(result.failures[1]?.sourcePath).toBe('/old/b.json');
        expect(workspace.writeOutputAtomically).toHaveBeenCalledOnce();
        expect(workspace.writeOutputAtomically).toHaveBeenCalledWith(
            '/new/c.nd.json', expect.any(String), { overwrite: false }
        );
    });

    it('reuses atomic overwrite policy for legacy output', async () => {
        const workspace = createWorkspace();
        workspace.findSourceFiles.mockResolvedValue([
            { path: '/old/chs1.json', relativePath: 'chs1.json' }
        ]);
        workspace.readTextFile.mockResolvedValue('{}');
        const run = vi.fn().mockReturnValue(createParseResult({ blocks: [] }));
        const result = await new ParseDirectoryUseCase({ run }, workspace).run({
            format: 'legacy-normalized-document', directory: '/old',
            outputDirectory: '/new', overwrite: true
        });
        expect(workspace.pathExists).not.toHaveBeenCalled();
        expect(workspace.writeOutputAtomically).toHaveBeenCalledWith(
            '/new/chs1.nd.json', expect.any(String), { overwrite: true }
        );
        expect(result).toMatchObject({ converted: 1, failed: 0 });
    });
});
