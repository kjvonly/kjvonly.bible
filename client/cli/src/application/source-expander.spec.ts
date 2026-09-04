import {
	mkdtemp,
	mkdir,
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
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import type {
	ResourceDefinition
} from '../domain/manifest.js';

import {
	SourceExpander
} from './source-expander.js';


const directories:
	string[] = [];


async function createDirectory():
	Promise<string> {

	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-source-'
			)
		);


	directories.push(
		directory
	);


	return directory;
}


function createResource(
	path:
		string
): ResourceDefinition {

	return {
		path,

		event: {
			encoding: [
				'hex'
			],

			tags: [
				[
					'd',
					'kjvonly/test/${key}'
				],
				[
					'm',
					'application/json+gzip+hex'
				],
				[
					't',
					'kjvonly/test'
				]
			]
		}
	};
}


afterEach(
	async () => {

		for (
			const directory
			of directories.splice(0)
		) {
			await rm(
				directory,
				{
					recursive:
						true,

					force:
						true
				}
			);
		}
	}
);


describe(
	'SourceExpander',
	() => {

		it(
			'expands a file into one concrete source',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'1_1.json.gz'
					);


				await writeFile(
					sourcePath,
					'content'
				);


				const expander =
					new SourceExpander(
						new NodeSourceRepository()
					);


				const sources =
					await expander.expand({
						manifestDirectory:
							directory,

						resourceName:
							'chapter',

						resource:
							createResource(
								'./1_1.json.gz'
							)
					});


				expect(
					sources
				).toHaveLength(1);


				expect(
					sources[0]?.key
				).toBe(
					'1_1'
				);


				expect(
					sources[0]?.event
						.tags[0]
				).toEqual([
					'd',
					'kjvonly/test/1_1'
				]);
			}
		);


		it(
			'expands direct regular directory files in lexical order',
			async () => {

				const directory =
					await createDirectory();


				const chapters =
					join(
						directory,
						'chapters'
					);


				await mkdir(
					chapters
				);


				await writeFile(
					join(
						chapters,
						'1_2.json.gz'
					),
					''
				);


				await writeFile(
					join(
						chapters,
						'1_1.json.gz'
					),
					''
				);


				await writeFile(
					join(
						chapters,
						'.DS_Store'
					),
					''
				);


				const nested =
					join(
						chapters,
						'nested'
					);


				await mkdir(
					nested
				);


				await writeFile(
					join(
						nested,
						'1_0.json.gz'
					),
					''
				);


				const expander =
					new SourceExpander(
						new NodeSourceRepository()
					);


				const sources =
					await expander.expand({
						manifestDirectory:
							directory,

						resourceName:
							'chapters',

						resource:
							createResource(
								'./chapters'
							)
					});


				expect(
					sources.map(
						source =>
							source.key
					)
				).toEqual([
					'1_1',
					'1_2'
				]);
			}
		);


		it(
			'resolves source paths relative to the manifest directory',
			async () => {

				const root =
					await createDirectory();


				const manifestDirectory =
					join(
						root,
						'manifests'
					);


				const dataDirectory =
					join(
						root,
						'data'
					);


				await mkdir(
					manifestDirectory
				);


				await mkdir(
					dataDirectory
				);


				await writeFile(
					join(
						dataDirectory,
						'1_1.json.gz'
					),
					''
				);


				const expander =
					new SourceExpander(
						new NodeSourceRepository()
					);


				const sources =
					await expander.expand({
						manifestDirectory,

						resourceName:
							'chapter',

						resource:
							createResource(
								'../data/1_1.json.gz'
							)
					});


				expect(
					sources[0]?.path
				).toBe(
					join(
						dataDirectory,
						'1_1.json.gz'
					)
				);
			}
		);


		it(
			'rejects duplicate derived keys',
			async () => {

				const directory =
					await createDirectory();


				const data =
					join(
						directory,
						'data'
					);


				await mkdir(
					data
				);


				await writeFile(
					join(
						data,
						'1_1.json.gz'
					),
					''
				);


				await writeFile(
					join(
						data,
						'1_1.txt'
					),
					''
				);


				const expander =
					new SourceExpander(
						new NodeSourceRepository()
					);


				await expect(
					expander.expand({
						manifestDirectory:
							directory,

						resourceName:
							'chapters',

						resource:
							createResource(
								'./data'
							)
					})
				).rejects.toThrow(
					'Resource "chapters" contains duplicate source key: 1_1'
				);
			}
		);


		it(
			'rejects a missing source path',
			async () => {

				const directory =
					await createDirectory();


				const expander =
					new SourceExpander(
						new NodeSourceRepository()
					);


				await expect(
					expander.expand({
						manifestDirectory:
							directory,

						resourceName:
							'chapters',

						resource:
							createResource(
								'./missing'
							)
					})
				).rejects.toThrow(
					'source path does not exist'
				);
			}
		);
	}
);