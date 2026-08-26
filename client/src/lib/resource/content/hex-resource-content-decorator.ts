import type {
	ResourceContentDecorator
} from './resource-content-decorator';

export class HexResourceContentDecorator
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

		if (
			!(
				innerValue instanceof
				Uint8Array
			)
		) {
			throw new Error(
				'Hex Resource content must be a Uint8Array when encoding.'
			);
		}

		return encodeHex(
			innerValue
		);
	}

	async decode(
		value: unknown
	): Promise<unknown> {
		if (
			typeof value !==
			'string'
		) {
			throw new Error(
				'Hex Resource content must be a string when decoding.'
			);
		}

		const bytes =
			decodeHex(
				value
			);

		return this.inner.decode(
			bytes
		);
	}
}

function decodeHex(
	value: string
): Uint8Array {
	if (
		value.length % 2 !==
		0
	) {
		throw new Error(
			'Hex Resource content must contain an even number of characters.'
		);
	}

	if (
		!/^[0-9a-fA-F]*$/.test(
			value
		)
	) {
		throw new Error(
			'Hex Resource content contains invalid characters.'
		);
	}

	const bytes =
		new Uint8Array(
			value.length / 2
		);

	for (
		let index = 0;
		index < bytes.length;
		index++
	) {
		const offset =
			index * 2;

		bytes[index] =
			Number.parseInt(
				value.slice(
					offset,
					offset + 2
				),
				16
			);
	}

	return bytes;
}

function encodeHex(
	value: Uint8Array
): string {
	let result = '';

	for (
		const byte of value
	) {
		result +=
			byte
				.toString(16)
				.padStart(
					2,
					'0'
				);
	}

	return result;
}