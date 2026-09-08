import { Encoding } from "#domain/manifest/manifest.js";

export interface ByteEncoder {
	readonly encoding:
		Encoding;


	encode(
		input:
			Uint8Array
	): Uint8Array;
}