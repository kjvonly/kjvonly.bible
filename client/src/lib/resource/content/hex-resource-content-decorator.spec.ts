import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BaseResourceContentDecorator
} from './base-resource-content-decorator';

import {
	HexResourceContentDecorator
} from './hex-resource-content-decorator';

describe(
	'HexResourceContentDecorator',
	() => {
		it(
			'decodes a hex string into bytes',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.decode(
						'48656c6c6f'
					);

				expect(
					result
				).toEqual(
					new Uint8Array([
						72,
						101,
						108,
						108,
						111
					])
				);
			}
		);

		it(
			'decodes uppercase hex characters',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.decode(
						'48656C6C6F'
					);

				expect(
					result
				).toEqual(
					new Uint8Array([
						72,
						101,
						108,
						108,
						111
					])
				);
			}
		);

		it(
			'encodes bytes as lowercase hex',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.encode(
						new Uint8Array([
							72,
							101,
							108,
							108,
							111
						])
					);

				expect(
					result
				).toBe(
					'48656c6c6f'
				);
			}
		);

		it(
			'preserves leading zeroes while encoding',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.encode(
						new Uint8Array([
							0,
							1,
							15,
							16,
							255
						])
					);

				expect(
					result
				).toBe(
					'00010f10ff'
				);
			}
		);

		it(
			'rejects odd-length hex content',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						'abc'
					)
				).rejects.toThrow(
					'Hex Resource content must contain an even number of characters.'
				);
			}
		);

		it(
			'rejects invalid hex characters',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						'zz'
					)
				).rejects.toThrow(
					'Hex Resource content contains invalid characters.'
				);
			}
		);

		it(
			'rejects non-string decoded input',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						new Uint8Array([
							1,
							2,
							3
						])
					)
				).rejects.toThrow(
					'Hex Resource content must be a string when decoding.'
				);
			}
		);

		it(
			'rejects non-byte encoded input',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.encode(
						'hello'
					)
				).rejects.toThrow(
					'Hex Resource content must be a Uint8Array when encoding.'
				);
			}
		);

		it(
			'round trips byte content',
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
	}
);

function createDecorator():
	HexResourceContentDecorator {
	return new HexResourceContentDecorator(
		new BaseResourceContentDecorator()
	);
}