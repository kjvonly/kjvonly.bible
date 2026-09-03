import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BaseResourceContentDecorator
} from './base-resource-content-decorator';

describe(
	'BaseResourceContentDecorator',
	() => {
		it(
			'passes decoded content through unchanged',
			async () => {
				const decorator =
					new BaseResourceContentDecorator();

				const value =
					new Uint8Array([
						1,
						2,
						3
					]);

				const result =
					await decorator.decode(
						value
					);

				expect(
					result
				).toBe(
					value
				);
			}
		);

		it(
			'passes encoded content through unchanged',
			async () => {
				const decorator =
					new BaseResourceContentDecorator();

				const value = {
					test:
						true
				};

				const result =
					await decorator.encode(
						value
					);

				expect(
					result
				).toBe(
					value
				);
			}
		);
	}
);