import {
	describe,
	expect,
	it
} from 'vitest';

import {
	JsonResourceContentCodec
} from './json-resource-content-codec';

describe(
	'JsonResourceContentCodec',
	() => {
		it(
			'encodes JSON',
			async () => {
				const codec =
					new JsonResourceContentCodec();

				const result =
					await codec.encode({
						chapter:
							1
					});

				expect(
					result
				).toBe(
					'{"chapter":1}'
				);
			}
		);

		it(
			'decodes JSON from a string',
			async () => {
				const codec =
					new JsonResourceContentCodec();

				const result =
					await codec.decode(
						'{"chapter":1}'
					);

				expect(
					result
				).toEqual({
					chapter:
						1
				});
			}
		);

		it(
			'decodes JSON from bytes',
			async () => {
				const codec =
					new JsonResourceContentCodec();

				const result =
					await codec.decode(
						new TextEncoder()
							.encode(
								'{"chapter":1}'
							)
					);

				expect(
					result
				).toEqual({
					chapter:
						1
				});
			}
		);

		it(
			'rejects invalid JSON',
			async () => {
				const codec =
					new JsonResourceContentCodec();

				await expect(
					codec.decode(
						'not-json'
					)
				).rejects.toBeInstanceOf(
					SyntaxError
				);
			}
		);
	}
);