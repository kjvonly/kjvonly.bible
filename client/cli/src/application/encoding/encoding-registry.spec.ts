import {
	gunzipSync,
	gzipSync
} from 'node:zlib';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GzipEncoder
} from '../../adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '../../adapters/encoding/hex-encoder.js';

import {
	EncodingRegistry
} from './encoding-registry.js';


function createRegistry():
	EncodingRegistry {

	return new EncodingRegistry([
		new GzipEncoder(),
		new HexEncoder()
	]);
}


describe(
	'EncodingRegistry',
	() => {

		it(
			'returns unchanged bytes when no encodings are configured',
			() => {

				const input =
					Buffer.from(
						'hello'
					);


				const output =
					createRegistry()
						.encode(
							input,
							[]
						);


				expect(
					Buffer.from(
						output
					)
				).toEqual(
					input
				);
			}
		);


		it(
			'gzip encodes bytes',
			() => {

				const input =
					Buffer.from(
						'hello'
					);


				const output =
					createRegistry()
						.encode(
							input,
							[
								'gzip'
							]
						);


				expect(
					gunzipSync(
						output
					)
				).toEqual(
					input
				);
			}
		);


		it(
			'hex encodes bytes',
			() => {

				const input =
					Buffer.from(
						'hello'
					);


				const output =
					createRegistry()
						.encode(
							input,
							[
								'hex'
							]
						);


				expect(
					Buffer.from(
						output
					).toString(
						'utf8'
					)
				).toBe(
					input.toString(
						'hex'
					)
				);
			}
		);


		it(
			'applies gzip before hex',
			() => {

				const input =
					Buffer.from(
						'hello'
					);


				const output =
					createRegistry()
						.encode(
							input,
							[
								'gzip',
								'hex'
							]
						);


				const encoded =
					Buffer.from(
						output
					).toString(
						'utf8'
					);


				const compressed =
					Buffer.from(
						encoded,
						'hex'
					);


				expect(
					gunzipSync(
						compressed
					)
				).toEqual(
					input
				);
			}
		);


		it(
			'hexes existing gzip bytes without decompressing them',
			() => {

				const gzipBytes =
					gzipSync(
						Buffer.from(
							'hello'
						)
					);


				const output =
					createRegistry()
						.encode(
							gzipBytes,
							[
								'hex'
							]
						);


				expect(
					Buffer.from(
						output
					).toString(
						'utf8'
					)
				).toBe(
					gzipBytes.toString(
						'hex'
					)
				);
			}
		);
	}
);