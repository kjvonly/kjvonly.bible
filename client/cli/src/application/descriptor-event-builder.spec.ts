import {
	verifyEvent
} from 'nostr-tools/pure';

import {
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
	DescriptorEventBuilder
} from './descriptor-event-builder.js';

import {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import {
	ResourceDescriptorBuilder
} from './resource-descriptor-builder.js';


const secretKey =
	'01'.repeat(
		32
	);


describe(
	'DescriptorEventBuilder',
	() => {

		it(
			'builds an encoded signed descriptor event',
			async () => {

				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const builder =
					new DescriptorEventBuilder(
						new EncodingRegistry([
							new GzipEncoder(),
							new HexEncoder()
						]),

						signer,

						{
							nowEpochSeconds:
								() =>
									1000
						},

						new ResourceDescriptorBuilder()
					);


				const result =
					await builder.build({
						source: {
							resourceName:
								'bundle',

							key:
								'kjvs',

							path:
								'/data/kjvs.json.gz',

							event: {
								encoding: [
									'hex'
								],

								tags: [
									[
										'd',
										'kjvonly/bible/chapters/kjvs'
									],
									[
										'm',
										'application/json+hex'
									],
									[
										't',
										'kjvonly/bible/chapters'
									],
									[
										'representation',
										'descriptors'
									]
								]
							},

							objectUpload: {
								mediaType:
									'application/json+gzip',

								encoding:
									[]
							}
						},

						artifact: {
							path:
								'/artifact',

							kind:
								'symlink',

							size:
								123,

							metadata: {
								key:
									'kjvs',

								sourceMtimeMs:
									1,

								sourceSize:
									123,

								artifactRevision:
									'12345678',

								sha256:
									'a'.repeat(
										64
									),

								extension:
									'.json.gz'
							}
						},

						strategy: {
							type:
								'blossom',

							data: {
								urls: [
									'https://blossom.example/a'
								],

								sha256:
									'a'.repeat(
										64
									),

								size:
									123
							}
						},

						publisher:
							await signer
								.getPublicKey(),

						kind:
							37770
					});


				expect(
					verifyEvent(
						result.event
					)
				).toBe(
					true
				);


				expect(
					result.event.tags
				).toEqual([
					[
						'd',
						'kjvonly/bible/chapters/kjvs'
					],
					[
						'm',
						'application/json+hex'
					],
					[
						't',
						'kjvonly/bible/chapters'
					],
					[
						'representation',
						'descriptors'
					]
				]);


				const decoded =
					JSON.parse(
						Buffer.from(
							result.event.content,
							'hex'
						).toString(
							'utf8'
						)
					);


				expect(
					Array.isArray(
						decoded
					)
				).toBe(
					true
				);


				expect(
					decoded[0]
						.metadata
						.mediaType
				).toBe(
					'application/json+gzip'
				);


				expect(
					decoded[0]
						.metadata
						.modifiedAt
				).toBe(
					1000
				);
			}
		);
	}
);