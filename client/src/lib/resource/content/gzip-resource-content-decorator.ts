import type {
	ResourceContentDecorator
} from './resource-content-decorator';

export class GzipResourceContentDecorator
	implements ResourceContentDecorator {

	constructor(
		private readonly inner:
			ResourceContentDecorator
	) {}

	async encode(
		value: unknown
	): Promise<unknown> {
		const innerValue =
			await this.inner.encode(
				value
			);

		const bytes =
			toBytes(
				innerValue
			);

		return compressGzip(
			bytes
		);
	}

	async decode(
		value: unknown
	): Promise<unknown> {
		if (
			!(
				value instanceof
				Uint8Array
			)
		) {
			throw new Error(
				'Gzip Resource content must be a Uint8Array when decoding.'
			);
		}

		const bytes =
			await decompressGzip(
				value
			);

		return this.inner.decode(
			bytes
		);
	}
}

function toBytes(
	value: unknown
): Uint8Array {
	if (
		value instanceof
		Uint8Array
	) {
		return value;
	}

	if (
		typeof value ===
		'string'
	) {
		return new TextEncoder()
			.encode(
				value
			);
	}

	throw new Error(
		'Gzip Resource content must be a string or Uint8Array when encoding.'
	);
}

async function compressGzip(
	value: Uint8Array
): Promise<Uint8Array> {
	const stream =
		new CompressionStream(
			'gzip'
		);

	const writer =
		stream.writable
			.getWriter();

	await writer.write(
		toArrayBuffer(
			value
		)
	);

	await writer.close();

	const buffer =
		await new Response(
			stream.readable
		).arrayBuffer();

	return new Uint8Array(
		buffer
	);
}

async function decompressGzip(
	value: Uint8Array
): Promise<Uint8Array> {
	const stream =
		new DecompressionStream(
			'gzip'
		);

	const writer =
		stream.writable
			.getWriter();

	await writer.write(
		toArrayBuffer(
			value
		)
	);

	await writer.close();

	const buffer =
		await new Response(
			stream.readable
		).arrayBuffer();

	return new Uint8Array(
		buffer
	);
}

function toArrayBuffer(
	value: Uint8Array
): ArrayBuffer {
	const buffer =
		new ArrayBuffer(
			value.byteLength
		);

	new Uint8Array(
		buffer
	).set(
		value
	);

	return buffer;
}