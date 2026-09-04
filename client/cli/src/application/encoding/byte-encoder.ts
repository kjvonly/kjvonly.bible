import type {
	Encoding
} from '../../domain/manifest.js';


export interface ByteEncoder {
	readonly encoding:
		Encoding;


	encode(
		input:
			Uint8Array
	): Uint8Array;
}