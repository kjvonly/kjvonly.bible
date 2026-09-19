import {
	describe,
	expect,
	it
} from 'vitest';

import {
	type KJVOnlyArchiveV1
} from './kjvonly-archive';

import {
	KJVOnlyArchiveCodec
} from './kjvonly-archive-codec';

const ID =
	'notes/note:publisher/default/note-1';

function createArchive():
	KJVOnlyArchiveV1 {
	return {
		version: 1,
		domain_objects: {
			[ID]: {
				id: ID,
				objectType:
					'notes/note',
				objectId:
					'publisher/default/note-1',
				value: {
					title:
						'Archive note'
				}
			}
		},
		resource_installations: {
			[ID]: {
				id: ID,
				objectType:
					'notes/note',
				objectId:
					'publisher/default/note-1',
				publisher:
					'publisher',
				modifiedAt:
					100
			}
		}
	};
}

describe(
	'KJVOnlyArchiveCodec',
	() => {
		it(
			'round trips an archive through gzip JSON',
			async () => {
				const codec =
					new KJVOnlyArchiveCodec();

				const archive =
					createArchive();

				const encoded =
					await codec.encode(
						archive
					);

				expect(
					encoded[
						0
					]
				).toBe(
					0x1f
				);

				expect(
					encoded[
						1
					]
				).toBe(
					0x8b
				);

				expect(
					await codec.decode(
						encoded
					)
				).toEqual(
					archive
				);
			}
		);

		it(
			'rejects invalid gzip data',
			async () => {
				const codec =
					new KJVOnlyArchiveCodec();

				await expect(
					codec.decode(
						new TextEncoder()
							.encode(
								'not gzip'
							)
					)
				).rejects.toThrow(
					'Invalid KJVOnly archive: content is not valid gzip data.'
				);
			}
		);

		it(
			'rejects gzip containing invalid JSON',
			async () => {
				const bytes =
					await gzip(
						'not json'
					);

				await expect(
					new KJVOnlyArchiveCodec()
						.decode(
							bytes
						)
				).rejects.toThrow(
					'Invalid KJVOnly archive: decompressed content is not valid JSON.'
				);
			}
		);

		it(
			'validates decoded archive structure',
			async () => {
				const bytes =
					await gzip(
						JSON.stringify({
							version: 2,
							domain_objects: {},
							resource_installations: {}
						})
					);

				await expect(
					new KJVOnlyArchiveCodec()
						.decode(
							bytes
						)
				).rejects.toThrow(
					'Unsupported KJVOnly archive version: 2.'
				);
			}
		);
	}
);

async function gzip(
	value: string
): Promise<Uint8Array> {
	const stream =
		new Blob([
			value
		])
			.stream()
			.pipeThrough(
				new CompressionStream(
					'gzip'
				)
			);

	return new Uint8Array(
		await new Response(
			stream
		).arrayBuffer()
	);
}
