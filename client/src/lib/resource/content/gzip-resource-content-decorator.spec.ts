import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BaseResourceContentDecorator
} from './base-resource-content-decorator';

import {
	GzipResourceContentDecorator
} from './gzip-resource-content-decorator';

describe(
	'GzipResourceContentDecorator',
	() => {
		it(
			'encodes string content as gzip bytes',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.encode(
						'hello'
					);

				expect(
					result
				).toBeInstanceOf(
					Uint8Array
				);

				expect(
					(result as Uint8Array)
						.length
				).toBeGreaterThan(
					0
				);
			}
		);

		it(
			'encodes byte content as gzip bytes',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.encode(
						new TextEncoder()
							.encode(
								'hello'
							)
					);

				expect(
					result
				).toBeInstanceOf(
					Uint8Array
				);

				expect(
					(result as Uint8Array)
						.length
				).toBeGreaterThan(
					0
				);
			}
		);

		it(
			'decodes gzip bytes into decompressed bytes',
			async () => {
				const decorator =
					createDecorator();

				const encoded =
					await compress(
						new TextEncoder()
							.encode(
								'hello'
							)
					);

				const decoded =
					await decorator.decode(
						encoded
					);

				expect(
					decoded
				).toEqual(
					new TextEncoder()
						.encode(
							'hello'
						)
				);
			}
		);

		it(
			'round trips string content through gzip',
			async () => {
				const decorator =
					createDecorator();

				const encoded =
					await decorator.encode(
						'hello world'
					);

				const decoded =
					await decorator.decode(
						encoded
					);

				expect(
					new TextDecoder()
						.decode(
							decoded as Uint8Array
						)
				).toBe(
					'hello world'
				);
			}
		);

		it(
			'round trips byte content through gzip',
			async () => {
				const decorator =
					createDecorator();

				const original =
					new Uint8Array([
						0,
						1,
						2,
						15,
						16,
						127,
						128,
						254,
						255
					]);

				const encoded =
					await decorator.encode(
						original
					);

				const decoded =
					await decorator.decode(
						encoded
					);

				expect(
					decoded
				).toEqual(
					original
				);
			}
		);

		it(
			'encodes large content without blocking on stream backpressure',
			async () => {
				const decorator =
					createDecorator();

				const original =
					createLargeContent();

				const encoded =
					await decorator.encode(
						original
					);

				expect(
					encoded
				).toBeInstanceOf(
					Uint8Array
				);

				const decoded =
					await decompress(
						encoded as Uint8Array
					);

				expect(
					new TextDecoder()
						.decode(
							decoded
						)
				).toBe(
					original
				);
			}
		);

		it(
			'decodes large gzip content without blocking on stream backpressure',
			async () => {
				const decorator =
					createDecorator();

				const original =
					createLargeContent();

				const encoded =
					await compress(
						new TextEncoder()
							.encode(
								original
							)
					);

				const decoded =
					await decorator.decode(
						encoded
					);

				expect(
					new TextDecoder()
						.decode(
							decoded as Uint8Array
						)
				).toBe(
					original
				);
			}
		);

		it(
			'rejects unsupported encoded input types',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.encode(
						123
					)
				).rejects.toThrow(
					'Gzip Resource content must be a string or Uint8Array when encoding.'
				);
			}
		);

		it(
			'rejects non-byte decoded input',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						'not-gzip'
					)
				).rejects.toThrow(
					'Gzip Resource content must be a Uint8Array when decoding.'
				);
			}
		);

		it(
			'rejects invalid gzip bytes',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						new Uint8Array([
							1,
							2,
							3,
							4
						])
					)
				).rejects.toThrow();
			}
		);
	}
);

function createDecorator():
	GzipResourceContentDecorator {
	return new GzipResourceContentDecorator(
		new BaseResourceContentDecorator()
	);
}

function createLargeContent():
	string {
	return JSON.stringify({
		chapter:
			1,

		verses:
			Array.from(
				{
					length:
						10_000
				},
				(
					_,
					index
				) => ({
					number:
						index + 1,

					text:
						'In the beginning God created the heaven and the earth.'
				})
			)
	});
}

async function compress(
	value: Uint8Array
): Promise<Uint8Array> {
	const stream =
		new CompressionStream(
			'gzip'
		);

	const resultPromise =
		new Response(
			stream.readable
		).arrayBuffer();

	const writer =
		stream.writable
			.getWriter();

	await writer.write(
		toArrayBuffer(
			value
		)
	);

	await writer.close();

	return new Uint8Array(
		await resultPromise
	);
}

async function decompress(
	value: Uint8Array
): Promise<Uint8Array> {
	const stream =
		new DecompressionStream(
			'gzip'
		);

	const resultPromise =
		new Response(
			stream.readable
		).arrayBuffer();

	const writer =
		stream.writable
			.getWriter();

	await writer.write(
		toArrayBuffer(
			value
		)
	);

	await writer.close();

	return new Uint8Array(
		await resultPromise
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