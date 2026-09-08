import {
	mkdtemp,
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
	NodeManifestLoader
} from './node-manifest-loader.js';


const directories:
	string[] = [];


async function createDirectory():
	Promise<string> {

	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-cli-'
			)
		);


	directories.push(
		directory
	);


	return directory;
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
	'NodeManifestLoader',
	() => {

		it(
			'renders template environment values',
			async () => {

				const directory =
					await createDirectory();


				const manifestPath =
					join(
						directory,
						'manifest.yaml'
					);


				await writeFile(
					manifestPath,
					`
version: 1
kind: 37770

staging:
  path: "{{ env.STAGING_PATH }}"

nostr:
  relays:
    - "{{ env.RELAY_URL }}"

resources: {}
collections: {}
`
				);


				const loader =
					new NodeManifestLoader({
						workingDirectory:
							directory,

						runtimeEnvironment: {
							STAGING_PATH:
								'./stage',

							RELAY_URL:
								'wss://relay.example'
						}
					});


				const loaded =
					await loader.load(
						manifestPath
					);


				expect(
					loaded.manifest
						.staging.path
				).toBe(
					'./stage'
				);


				expect(
					loaded.manifest
						.nostr.relays
				).toEqual([
					'wss://relay.example'
				]);
			}
		);


		it(
			'gives runtime environment precedence over .env',
			async () => {

				const directory =
					await createDirectory();


				const manifestPath =
					join(
						directory,
						'manifest.yaml'
					);


				const envPath =
					join(
						directory,
						'.env'
					);


				await writeFile(
					envPath,
					'RELAY_URL=wss://dotenv.example\n'
				);


				await writeFile(
					manifestPath,
					`
version: 1
kind: 37770

staging:
  path: ./.kjvonly

nostr:
  relays:
    - "{{ env.RELAY_URL }}"

resources: {}
collections: {}
`
				);


				const loader =
					new NodeManifestLoader({
						workingDirectory:
							directory,

						envFilePath:
							envPath,

						runtimeEnvironment: {
							RELAY_URL:
								'wss://runtime.example'
						}
					});


				const loaded =
					await loader.load(
						manifestPath
					);


				expect(
					loaded.manifest
						.nostr.relays
				).toEqual([
					'wss://runtime.example'
				]);
			}
		);


		it(
			'rejects NOSTR_SECRET_KEY from .env',
			async () => {

				const directory =
					await createDirectory();


				const manifestPath =
					join(
						directory,
						'manifest.yaml'
					);


				const envPath =
					join(
						directory,
						'.env'
					);


				await writeFile(
					envPath,
					'NOSTR_SECRET_KEY=secret\n'
				);


				await writeFile(
					manifestPath,
					`
version: 1
kind: 37770

staging:
  path: ./.kjvonly

nostr:
  relays:
    - wss://relay.example

resources: {}
collections: {}
`
				);


				const loader =
					new NodeManifestLoader({
						workingDirectory:
							directory,

						envFilePath:
							envPath,

						runtimeEnvironment:
							{}
					});


				await expect(
					loader.load(
						manifestPath
					)
				).rejects.toThrow(
					'NOSTR_SECRET_KEY must not be defined in .env.'
				);
			}
		);


		it(
			'does not expose runtime NOSTR_SECRET_KEY to templates',
			async () => {

				const directory =
					await createDirectory();


				const manifestPath =
					join(
						directory,
						'manifest.yaml'
					);


				await writeFile(
					manifestPath,
					`
version: 1
kind: 37770

staging:
  path: "{{ env.NOSTR_SECRET_KEY }}"

nostr:
  relays:
    - wss://relay.example

resources: {}
collections: {}
`
				);


				const loader =
					new NodeManifestLoader({
						workingDirectory:
							directory,

						runtimeEnvironment: {
							NOSTR_SECRET_KEY:
								'do-not-expose'
						}
					});


				await expect(
					loader.load(
						manifestPath
					)
				).rejects.toThrow();
			}
		);


		it(
			'leaves ${key} untouched',
			async () => {

				const directory =
					await createDirectory();


				const manifestPath =
					join(
						directory,
						'manifest.yaml'
					);


				await writeFile(
					manifestPath,
					`
version: 1
kind: 37770

staging:
  path: ./.kjvonly

nostr:
  relays:
    - wss://relay.example

resources:
  chapters:
    path: ./chapters

    event:
      encoding:
        - hex

      tags:
        - ["d", "kjvonly/bible/chapters/kjvs/\${key}"]
        - ["m", "application/json+gzip+hex"]
        - ["t", "kjvonly/bible/chapters"]
        - ["representation", "content"]

collections: {}
`
				);


				const loader =
					new NodeManifestLoader({
						workingDirectory:
							directory,

						runtimeEnvironment:
							{}
					});


				const loaded =
					await loader.load(
						manifestPath
					);


				expect(
					loaded.manifest
						.resources
						.chapters
						.event
						.tags[0]
				).toEqual([
					'd',
					'kjvonly/bible/chapters/kjvs/${key}'
				]);
			}
		);
	}
);