import {
	mkdtemp,
	mkdir,
	readFile,
	readdir,
	rm,
	writeFile
} from 'node:fs/promises';

import {
	join
} from 'node:path';

import {
	tmpdir
} from 'node:os';

import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	NodeParseWorkspace
} from './node-parse-workspace.js';

const temporaryDirectories:
	string[] = [];

async function createTemporaryDirectory(): Promise<string> {
	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-cli-parse-'
			)
		);

	temporaryDirectories.push(
		directory
	);

	return directory;
}

afterEach(
	async () => {
		await Promise.all(
			temporaryDirectories.splice(
				0
			).map(
				directory =>
					rm(
						directory,
						{
							recursive:
								true,
							force:
								true
						}
					)
			)
		);
	}
);

describe(
	'NodeParseWorkspace',
	() => {
		it(
			'recursively discovers supported files in deterministic path order',
			async () => {
				const root =
					await createTemporaryDirectory();

				const nested =
					join(
						root,
						'nested'
					);

				await mkdir(
					nested
				);

				await Promise.all([
					writeFile(
						join(
							root,
							'z.html'
						),
						'z'
					),
					writeFile(
						join(
							root,
							'a.HTM'
						),
						'a'
					),
					writeFile(
						join(
							nested,
							'b.cfm'
						),
						'b'
					),
					writeFile(
						join(
							nested,
							'ignore.txt'
						),
						'ignore'
					)
				]);

				const workspace =
					new NodeParseWorkspace();

				const files =
					await workspace.findSourceFiles(
						root,
						[
							'.cfm',
							'.htm',
							'.html'
						]
					);

				expect(
					files
				).toEqual([
					{
						path:
							join(
								root,
								'a.HTM'
							),
						relativePath:
							'a.HTM'
					},
					{
						path:
							join(
								nested,
								'b.cfm'
							),
						relativePath:
							'nested/b.cfm'
					},
					{
						path:
							join(
								root,
								'z.html'
							),
						relativePath:
							'z.html'
					}
				]);
			}
		);

		it(
			'resolves caller-named output paths without changing their formats and rejects traversal',
			async () => {
				const root = await createTemporaryDirectory();
				const workspace = new NodeParseWorkspace();

				expect(workspace.resolveDestinationOutputPath(root, 'Genesis/1.nd.json')).toBe(
					join(root, 'Genesis', '1.nd.json')
				);
				expect(workspace.resolveDestinationOutputPath(root, 'Exodus/2.html')).toBe(
					join(root, 'Exodus', '2.html')
				);
				expect(workspace.resolveDestinationOutputPath(root, 'books/chapter.epub')).toBe(
					join(root, 'books', 'chapter.epub')
				);
				expect(workspace.resolveDestinationOutputPath(root, 'exports/report')).toBe(
					join(root, 'exports', 'report')
				);
				expect(() => workspace.resolveDestinationOutputPath(root, '../escape.cfm'))
					.toThrow('Invalid parse destination');
				expect(() => workspace.resolveDestinationOutputPath(root, '/escape.cfm'))
					.toThrow('Invalid parse destination');
				expect(() => workspace.resolveDestinationOutputPath(root, '..\\escape.json'))
					.toThrow('Invalid parse destination');
				expect(() => workspace.resolveDestinationOutputPath(root, 'C:/escape.json'))
					.toThrow('Invalid parse destination');
				expect(() => workspace.resolveDestinationOutputPath('', 'Genesis/1.cfm'))
					.toThrow('Invalid parse destination');
			}
		);

		it(
			'creates nested destination directories before publishing atomic output',
			async () => {
				const root = await createTemporaryDirectory();
				const workspace = new NodeParseWorkspace();
				const outputPath = workspace.resolveDestinationOutputPath(
					join(root, 'normalized'), 'Genesis/1.nd.json'
				);

				await workspace.writeOutputAtomically(outputPath, '{"blocks":[]}\n', {
					overwrite: false
				});
				expect(await readFile(outputPath, 'utf8')).toBe('{"blocks":[]}\n');
				await expect(workspace.writeOutputAtomically(outputPath, 'replaced', {
					overwrite: false
				})).rejects.toMatchObject({ code: 'EEXIST' });
				await workspace.writeOutputAtomically(outputPath, 'replaced', { overwrite: true });
				expect(await readFile(outputPath, 'utf8')).toBe('replaced');
				expect((await readdir(join(root, 'normalized', 'Genesis'))).some(name =>
					name.includes('.kjvonly-tmp-')
				)).toBe(false);
			}
		);

		it(
			'creates a portable case-insensitive collision key without changing the emitted path',
			() => {
				const workspace =
					new NodeParseWorkspace();

				const upperCasePath =
					join(
						'root',
						'KJV',
						'Chapter.json'
					);

				const lowerCasePath =
					join(
						'root',
						'kjv',
						'chapter.json'
					);

				expect(
					workspace.getPathCollisionKey(
						upperCasePath
					)
				).toBe(
					workspace.getPathCollisionKey(
						lowerCasePath
					)
				);

				expect(
					upperCasePath
				).not.toBe(
					lowerCasePath
				);
			}
		);

		it(
			'reads, detects, and atomically publishes UTF-8 text files',
			async () => {
				const root =
					await createTemporaryDirectory();

				const sourcePath =
					join(
						root,
						'source.html'
					);

				const outputPath =
					join(
						root,
						'source.json'
					);

				await writeFile(
					sourcePath,
					'<p>Grace</p>',
					'utf8'
				);

				const workspace =
					new NodeParseWorkspace();

				expect(
					await workspace.readTextFile(
						sourcePath
					)
				).toBe(
					'<p>Grace</p>'
				);

				expect(
					await workspace.pathExists(
						outputPath
					)
				).toBe(
					false
				);

				await workspace.writeOutputAtomically(
					outputPath,
					'{"ok":true}\n',
					{
						overwrite:
							false
					}
				);

				expect(
					await workspace.pathExists(
						outputPath
					)
				).toBe(
					true
				);

				await expect(
					workspace.writeOutputAtomically(
						outputPath,
						'{"ok":false}\n',
						{
							overwrite:
								false
						}
					)
				).rejects.toMatchObject({
					code:
						'EEXIST'
				});

				await workspace.writeOutputAtomically(
					outputPath,
					'{"ok":false}\n',
					{
						overwrite:
							true
					}
				);

				expect(
					await readFile(
						outputPath,
						'utf8'
					)
				).toBe(
					'{"ok":false}\n'
				);

				const directoryEntries =
					await readdir(
						root
					);

				expect(
					directoryEntries.some(
						entry =>
							entry.includes(
								'.kjvonly-tmp-'
							)
					)
				).toBe(
					false
				);
			}
		);

		it(
			'leaves an existing output unchanged when non-overwrite publication loses the final-path race',
			async () => {
				const root =
					await createTemporaryDirectory();

				const outputPath =
					join(
						root,
						'race.json'
					);

				await writeFile(
					outputPath,
					'{"winner":"other-process"}\n',
					'utf8'
				);

				const workspace =
					new NodeParseWorkspace();

				await expect(
					workspace.writeOutputAtomically(
						outputPath,
						'{"winner":"parser"}\n',
						{
							overwrite:
								false
						}
					)
				).rejects.toMatchObject({
					code:
						'EEXIST'
				});

				expect(
					await readFile(
						outputPath,
						'utf8'
					)
				).toBe(
					'{"winner":"other-process"}\n'
				);

				const directoryEntries =
					await readdir(
						root
					);

				expect(
					directoryEntries.some(
						entry =>
							entry.includes(
								'.kjvonly-tmp-'
							)
					)
				).toBe(
					false
				);
			}
		);

		it(
			'rejects a non-directory root',
			async () => {
				const root =
					await createTemporaryDirectory();

				const file =
					join(
						root,
						'source.html'
					);

				await writeFile(
					file,
					'<p>Text</p>'
				);

				const workspace =
					new NodeParseWorkspace();

				await expect(
					workspace.findSourceFiles(
						file,
						[
							'.html'
						]
					)
				).rejects.toThrow(
					'Parse source is not a directory:'
				);
			}
		);
	}
);
