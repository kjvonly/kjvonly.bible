import type {
	Encoding
} from '../../domain/manifest.js';

import type {
	ByteEncoder
} from './byte-encoder.js';


export class EncodingRegistry {

	private readonly encoders:
		ReadonlyMap<
			Encoding,
			ByteEncoder
		>;


	constructor(
		encoders:
			readonly ByteEncoder[]
	) {

		this.encoders =
			new Map(
				encoders.map(
					encoder => [
						encoder.encoding,
						encoder
					]
				)
			);
	}


	encode(
		input:
			Uint8Array,

		encodings:
			readonly Encoding[]
	): Uint8Array {

		let output =
			input;


		for (
			const encoding
			of encodings
		) {
			const encoder =
				this.encoders.get(
					encoding
				);


			if (
				encoder ===
					undefined
			) {
				throw new Error(
					`No encoder registered for: ${encoding}`
				);
			}


			output =
				encoder.encode(
					output
				);
		}


		return output;
	}
}