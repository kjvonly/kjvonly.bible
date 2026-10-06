import {
	mkdtemp,
	mkdir,
	readFile,
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
			'reads, detects, and safely writes UTF-8 text files',
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

				await workspace.writeTextFile(
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
					workspace.writeTextFile(
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

				await workspace.writeTextFile(
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
