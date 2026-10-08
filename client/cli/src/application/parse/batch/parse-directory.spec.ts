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
		pathExists:
			vi.fn(),
		readTextFile:
			vi.fn(),
		writeTextFile:
			vi.fn()
	};
}

describe(
	'ParseDirectoryUseCase',
	() => {
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
					workspace.writeTextFile
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
					workspace.writeTextFile
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
					workspace.writeTextFile
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
					workspace.writeTextFile
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
							workspace.writeTextFile
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
					workspace.writeTextFile
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
