import {
	createHash
} from 'node:crypto';

import {
	lstat,
	mkdtemp,
	readdir,
	readFile,
	readlink,
	rm,
	unlink,
	writeFile
} from 'node:fs/promises';

import {
	join
} from 'node:path';

import {
	tmpdir
} from 'node:os';

import {
	gunzipSync
} from 'node:zlib';

import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	GzipEncoder
} from '../adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '../adapters/encoding/hex-encoder.js';

import {
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
	NodeArtifactStagingRepository
} from '../adapters/staging/node-artifact-staging-repository.js';

import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import type {
	Encoding
} from '../domain/manifest.js';

import {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import {
	ObjectArtifactStager
} from './object-artifact-stager.js';


const directories:
	string[] = [];


async function createDirectory():
	Promise<string> {

	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-artifact-'
			)
		);


	directories.push(
		directory
	);


	return directory;
}


function createSource(
	path:
		string,

	encoding:
		Encoding[]
): ConcreteSource {

	return {
		resourceName:
			'bundle',

		key:
			'bundle',

		path,

		event: {
			encoding: [
				'hex'
			],

			tags: [
				[
					'd',
					'kjvonly/test/bundle'
				]
			]
		},

		objectUpload: {
			mediaType:
				'application/octet-stream',

			encoding
		}
	};
}


function createStager(
	sourceRepository:
		NodeSourceRepository,

	artifactRepository:
		NodeArtifactStagingRepository
): ObjectArtifactStager {

	return new ObjectArtifactStager(
		sourceRepository,

		new EncodingRegistry([
			new GzipEncoder(),
			new HexEncoder()
		]),

		artifactRepository
	);
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
	'ObjectArtifactStager',
	() => {

		it(
			'stages identity object uploads as symlinks',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json.gz'
					);


				const bytes =
					Buffer.from(
						'already-final-bytes'
					);


				await writeFile(
					sourcePath,
					bytes
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const artifacts =
					await stager.stage({
						stagingRoot:
							join(
								directory,
								'.kjvonly'
							),

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[]
							)
						]
					});


				expect(
					artifacts
				).toHaveLength(1);


				const artifact =
					artifacts[0]!;


				expect(
					artifact.kind
				).toBe(
					'symlink'
				);


				expect(
					(
						await lstat(
							artifact.path
						)
					).isSymbolicLink()
				).toBe(
					true
				);


				expect(
					await readlink(
						artifact.path
					)
				).toBe(
					sourcePath
				);


				expect(
					artifact
						.metadata
						.sha256
				).toBe(
					createHash(
						'sha256'
					)
						.update(
							bytes
						)
						.digest(
							'hex'
						)
				);


				expect(
					artifact
						.metadata
						.extension
				).toBe(
					'.json.gz'
				);
			}
		);


		it(
			'stages transformed object uploads as materialized files',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json'
					);


				const bytes =
					Buffer.from(
						'transform-me'
					);


				await writeFile(
					sourcePath,
					bytes
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const artifacts =
					await stager.stage({
						stagingRoot:
							join(
								directory,
								'.kjvonly'
							),

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[
									'gzip'
								]
							)
						]
					});


				const artifact =
					artifacts[0]!;


				expect(
					artifact.kind
				).toBe(
					'file'
				);


				expect(
					(
						await lstat(
							artifact.path
						)
					).isFile()
				).toBe(
					true
				);


				const stagedBytes =
					await readFile(
						artifact.path
					);


				expect(
					gunzipSync(
						stagedBytes
					)
				).toEqual(
					bytes
				);


				expect(
					artifact
						.metadata
						.sha256
				).toBe(
					createHash(
						'sha256'
					)
						.update(
							stagedBytes
						)
						.digest(
							'hex'
						)
				);
			}
		);


		it(
			'reuses an unchanged artifact without reading or rebuilding it',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json'
					);


				await writeFile(
					sourcePath,
					'unchanged'
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const request = {
					stagingRoot:
						join(
							directory,
							'.kjvonly'
						),

					resourceName:
						'bundle',

					sources: [
						createSource(
							sourcePath,
							[
								'gzip'
							]
						)
					]
				};


				const first =
					await stager.stage(
						request
					);


				const readSpy =
					vi.spyOn(
						sourceRepository,
						'readFile'
					);


				const stageSpy =
					vi.spyOn(
						artifactRepository,
						'stageMaterialized'
					);


				const second =
					await stager.stage(
						request
					);


				expect(
					second[0]?.path
				).toBe(
					first[0]?.path
				);


				expect(
					readSpy
				).not.toHaveBeenCalled();


				expect(
					stageSpy
				).not.toHaveBeenCalled();
			}
		);


		it(
			'replaces an artifact when the source changes',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json'
					);


				await writeFile(
					sourcePath,
					'first'
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const stagingRoot =
					join(
						directory,
						'.kjvonly'
					);


				const first =
					await stager.stage({
						stagingRoot,

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[
									'gzip'
								]
							)
						]
					});


				await writeFile(
					sourcePath,
					'second source with different size'
				);


				const second =
					await stager.stage({
						stagingRoot,

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[
									'gzip'
								]
							)
						]
					});


				expect(
					second[0]?.path
				).not.toBe(
					first[0]?.path
				);


				expect(
					await readdir(
						join(
							stagingRoot,
							'artifacts',
							'bundle'
						)
					)
				).toHaveLength(1);
			}
		);


		it(
			'rebuilds when object-upload encoding changes',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json'
					);


				await writeFile(
					sourcePath,
					'content'
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const stagingRoot =
					join(
						directory,
						'.kjvonly'
					);


				const first =
					await stager.stage({
						stagingRoot,

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[]
							)
						]
					});


				expect(
					first[0]?.kind
				).toBe(
					'symlink'
				);


				const second =
					await stager.stage({
						stagingRoot,

						resourceName:
							'bundle',

						sources: [
							createSource(
								sourcePath,
								[
									'gzip'
								]
							)
						]
					});


				expect(
					second[0]?.kind
				).toBe(
					'file'
				);


				expect(
					second[0]?.path
				).not.toBe(
					first[0]?.path
				);


				expect(
					await readdir(
						join(
							stagingRoot,
							'artifacts',
							'bundle'
						)
					)
				).toHaveLength(1);
			}
		);


		it(
			'removes artifacts for removed source keys',
			async () => {

				const directory =
					await createDirectory();


				const sourcePath =
					join(
						directory,
						'bundle.json'
					);


				await writeFile(
					sourcePath,
					'content'
				);


				const sourceRepository =
					new NodeSourceRepository();


				const artifactRepository =
					new NodeArtifactStagingRepository();


				const stager =
					createStager(
						sourceRepository,
						artifactRepository
					);


				const stagingRoot =
					join(
						directory,
						'.kjvonly'
					);


				await stager.stage({
					stagingRoot,

					resourceName:
						'bundle',

					sources: [
						createSource(
							sourcePath,
							[]
						)
					]
				});


				await unlink(
					sourcePath
				);


				await stager.stage({
					stagingRoot,

					resourceName:
						'bundle',

					sources:
						[]
				});


				expect(
					await readdir(
						join(
							stagingRoot,
							'artifacts',
							'bundle'
						)
					)
				).toEqual(
					[]
				);
			}
		);
	}
);