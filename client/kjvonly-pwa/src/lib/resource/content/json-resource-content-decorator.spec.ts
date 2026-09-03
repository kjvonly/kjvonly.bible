import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BaseResourceContentDecorator
} from './base-resource-content-decorator';

import {
	JsonResourceContentDecorator
} from './json-resource-content-decorator';

describe(
	'JsonResourceContentDecorator',
	() => {
		it(
			'decodes JSON from a string',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.decode(
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
				const decorator =
					createDecorator();

				const result =
					await decorator.decode(
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
			'encodes a value as JSON',
			async () => {
				const decorator =
					createDecorator();

				const result =
					await decorator.encode({
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
			'rejects invalid JSON',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						'not-json'
					)
				).rejects.toBeInstanceOf(
					SyntaxError
				);
			}
		);

		it(
			'rejects unsupported decoded input types',
			async () => {
				const decorator =
					createDecorator();

				await expect(
					decorator.decode(
						123
					)
				).rejects.toThrow(
					'JSON Resource content must be a string or Uint8Array.'
				);
			}
		);
	}
);

function createDecorator():
	JsonResourceContentDecorator {
	return new JsonResourceContentDecorator(
		new BaseResourceContentDecorator()
	);
}