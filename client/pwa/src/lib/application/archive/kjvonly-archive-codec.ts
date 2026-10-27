import type {
	KJVOnlyArchiveV1
} from './kjvonly-archive';

import {
	KJVOnlyArchiveValidator
} from './kjvonly-archive-validator';

export class KJVOnlyArchiveCodec {
	constructor(
		private readonly validator =
			new KJVOnlyArchiveValidator()
	) {}

	async encode(
		archive: KJVOnlyArchiveV1
	): Promise<Uint8Array> {
		this.validator.validate(
			archive
		);

		const json =
			JSON.stringify(
				archive
			);

		return compressGzip(
			new TextEncoder()
				.encode(
					json
				)
		);
	}

	async decode(
		value: Uint8Array
	): Promise<KJVOnlyArchiveV1> {
		const bytes =
			await decompressGzip(
				value
			);

		const json =
			new TextDecoder()
				.decode(
					bytes
				);

		let parsed:
			unknown;

		try {
			parsed =
				JSON.parse(
					json
				);
		} catch {
			throw new Error(
				'Invalid KJVOnly archive: decompressed content is not valid JSON.'
			);
		}

		return this.validator.validate(
			parsed
		);
	}
}

async function compressGzip(
	value: Uint8Array
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

async function decompressGzip(
	value: Uint8Array
): Promise<Uint8Array> {
	try {
		const stream =
			new Blob([
				value
			])
				.stream()
				.pipeThrough(
					new DecompressionStream(
						'gzip'
					)
				);

		return new Uint8Array(
			await new Response(
				stream
			).arrayBuffer()
		);
	} catch {
		throw new Error(
			'Invalid KJVOnly archive: content is not valid gzip data.'
		);
	}
}
