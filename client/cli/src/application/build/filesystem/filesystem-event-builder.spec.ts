import {
	verifyEvent
} from 'nostr-tools/pure';

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
