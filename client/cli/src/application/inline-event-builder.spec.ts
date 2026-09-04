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
	gzipSync
} from 'node:zlib';

import {
	verifyEvent
} from 'nostr-tools/pure';

import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	GzipEncoder
} from '../adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '../adapters/encoding/hex-encoder.js';

import {
	LocalNostrSigner
} from '../adapters/nostr/local-nostr-signer.js';

import {
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import {
	InlineEventBuilder
} from './inline-event-builder.js';


const directories:
	string[] = [];


const secretKey =
	'01'.repeat(
		32
	);


async function createDirectory():
	Promise<string> {

	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-event-'
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
	'InlineEventBuilder',
	() => {

		it(
			'builds and signs an inline gzip chapter',
			async () => {

				const directory =
					await createDirectory();


				const path =
					join(
						directory,
						'1_1.json.gz'
					);


				const gzipBytes =
					gzipSync(
						Buffer.from(
							'{"chapter":1}'
						)
					);


				await writeFile(
					path,
					gzipBytes
				);


				const repository =
					new NodeSourceRepository();


				const encodingRegistry =
					new EncodingRegistry([
						new GzipEncoder(),
						new HexEncoder()
					]);


				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const clock = {
					nowEpochSeconds:
						() =>
							1_000
				};


				const builder =
					new InlineEventBuilder(
						repository,
						encodingRegistry,
						signer,
						clock
					);


				const event =
					await builder.build(
						{
							resourceName:
								'bible-chapters-kjvs',

							key:
								'1_1',

							path,

							event: {
								encoding: [
									'hex'
								],

								tags: [
									[
										'd',
										'kjvonly/bible/chapters/kjvs/1_1'
									],
									[
										'm',
										'application/json+gzip+hex'
									],
									[
										't',
										'kjvonly/bible/chapters'
									],
									[
										'representation',
										'content'
									]
								]
							}
						},
						37770
					);


				expect(
					event.kind
				).toBe(
					37770
				);


				expect(
					event.created_at
				).toBe(
					1_000
				);


				expect(
					event.content
				).toBe(
					gzipBytes
						.toString(
							'hex'
						)
				);


				expect(
					event.tags
				).toEqual([
					[
						'd',
						'kjvonly/bible/chapters/kjvs/1_1'
					],
					[
						'm',
						'application/json+gzip+hex'
					],
					[
						't',
						'kjvonly/bible/chapters'
					],
					[
						'representation',
						'content'
					]
				]);


				expect(
					event.pubkey
				).toBe(
					await signer
						.getPublicKey()
				);


				expect(
					verifyEvent(
						event
					)
				).toBe(
					true
				);
			}
		);
	}
);