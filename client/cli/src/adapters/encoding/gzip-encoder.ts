import {
	gzipSync
} from 'node:zlib';

import type {
	ByteEncoder
} from '../../application/encoding/byte-encoder.js';


export class GzipEncoder
	implements ByteEncoder {

	readonly encoding =
		'gzip' as const;


	encode(
		input:
			Uint8Array
	): Uint8Array {

		return gzipSync(
			input
		);
	}
}