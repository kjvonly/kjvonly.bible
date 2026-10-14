import {
	verifyEvent
} from 'nostr-tools/pure';

import { gunzipSync } from 'node:zlib';

import { GzipEncoder } from '#adapters/encoding/gzip-encoder.js';
import { HexEncoder } from '#adapters/encoding/hex-encoder.js';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	LocalNostrSigner
} from '#adapters/nostr/signer/local-nostr-signer.js';

import {
	EncodingRegistry
} from '../encoding/encoding-registry.js';

import {
	FilesystemEventBuilder
} from './filesystem-event-builder.js';


const secretKey =
	'01'.repeat(
		32
	);


describe(
	'FilesystemEventBuilder',
	() => {
		it(
			'builds ordinary Resource content and derives the f tag from root',
			async () => {
				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const builder =
					new FilesystemEventBuilder(
						new EncodingRegistry([]),
						signer,
						{
							nowEpochSeconds:
								() => 1_000
						}
					);


				const content = {
					'library/books/foo': {
						descriptor: {
							metadata: {
								publisher:
									'a'.repeat(64),
								resourceId:
									'test/resource/foo',
								resourceType:
									'test/resource',
								dataType:
									'kjvonly.test',
								dataVersion:
									1,
								modifiedAt:
									100,
								representation:
									'content' as const,
								mediaType:
									'application/json'
							},
							strategy: {
								type:
									'nostr',
								data: {
									kind:
										37770,
									relays: [
										'wss://relay.example'
									]
								}
							}
						}
					}
				};


				const event =
					await builder.build({
						kind:
							37770,
						event: {
							encoding:
								[],
							tags: [
								['d', 'kjvonly/filesystem/library'],
								['m', 'application/json'],
								['t', 'filesystem/entry'],
								['dataType', 'kjvonly.filesystem.entries'],
								['dataVersion', '1'],
								['representation', 'content']
							]
						},
						root:
							'library',
						content
					});


				expect(
					event.created_at
				).toBe(
					1_000
				);


				expect(
					event.tags.at(-1)
				).toEqual([
					'f',
					'library'
				]);


				expect(
					JSON.parse(
						event.content
					)
				).toEqual(
					content
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


		it(
			'compresses and signs a large Filesystem index without changing its semantic entries',
			async () => {
				const root = 'app-filesystem';
				const content = Object.fromEntries(Array.from({ length: 1_200 }, (_, index) => {
					const path = `${root}/commentary/book-${String(Math.floor(index / 30)).padStart(2, '0')}/chapter-${String(index % 30 + 1).padStart(3, '0')}.nd.json`;
					return [path, {
						descriptor: {
							metadata: {
								publisher: 'a'.repeat(64),
								resourceId: `kjvonly/normalized-content/documents/${path}`,
								resourceType: 'normalized-content/document',
								dataType: 'kjvonly.normalized-document',
								dataVersion: 1,
								modifiedAt: 1_000,
								representation: 'content' as const,
								mediaType: 'application/json+gzip+hex'
							},
							strategy: { type: 'nostr', data: { kind: 37770, relays: ['wss://relay.example'] } }
						}
					}] as const;
				}));
				const builder = new FilesystemEventBuilder(
					new EncodingRegistry([new GzipEncoder(), new HexEncoder()]),
					new LocalNostrSigner(secretKey),
					{ nowEpochSeconds: () => 1_000 }
				);
				const event = await builder.build({
					kind: 37770,
					event: {
						encoding: ['gzip', 'hex'],
						tags: [
							['d', `kjvonly/filesystem/${root}`],
							['m', 'application/json+gzip+hex']
						]
					},
					root,
					content
				});
				expect(Object.keys(content)).toHaveLength(1_200);
				expect(event.content.length).toBeLessThan(1024 * 1024);
				expect(JSON.parse(gunzipSync(Buffer.from(event.content, 'hex')).toString('utf8'))).toEqual(content);
				expect(verifyEvent(event)).toBe(true);
			}
		);


		it(
			'advances created_at beyond the previous Filesystem revision',
			async () => {
				const builder =
					new FilesystemEventBuilder(
						new EncodingRegistry([]),
						new LocalNostrSigner(
							secretKey
						),
						{
							nowEpochSeconds:
								() => 100
						}
					);


				const event =
					await builder.build({
						kind:
							37770,
						event: {
							encoding:
								[],
							tags: [
								['d', 'filesystem-resource']
							]
						},
						root:
							'library',
						content:
							{},
						previousCreatedAt:
							250
					});


				expect(
					event.created_at
				).toBe(
					251
				);
			}
		);


		it(
			'rejects an explicitly declared f tag',
			async () => {
				const builder =
					new FilesystemEventBuilder(
						new EncodingRegistry([]),
						new LocalNostrSigner(
							secretKey
						),
						{
							nowEpochSeconds:
								() => 100
						}
					);


				await expect(
					builder.build({
						kind:
							37770,
						event: {
							encoding:
								[],
							tags: [
								['f', 'other']
							]
						},
						root:
							'library',
						content:
							{}
					})
				).rejects.toThrow(
					'Filesystem event definition must not declare an "f" tag'
				);
			}
		);
	}
);
