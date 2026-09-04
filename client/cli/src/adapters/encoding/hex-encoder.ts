import type {
	ByteEncoder
} from '../../application/encoding/byte-encoder.js';


export class HexEncoder
	implements ByteEncoder {

	readonly encoding =
		'hex' as const;


	encode(
		input:
			Uint8Array
	): Uint8Array {

		const hex =
			Buffer
				.from(
					input
				)
				.toString(
					'hex'
				);


		return Buffer.from(
			hex,
			'utf8'
		);
	}
}