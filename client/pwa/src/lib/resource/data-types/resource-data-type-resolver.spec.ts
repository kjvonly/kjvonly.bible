import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDataTypeHandler
} from './resource-data-type-handler';

import {
	ResourceDataTypeResolver
} from './resource-data-type-resolver';

class FakeDataTypeHandler implements ResourceDataTypeHandler {
	constructor(
		readonly dataType: string,
		readonly dataVersion: number
	) {}

	validate(
		value: unknown
	): unknown {
		return value;
	}
}

describe(
	'ResourceDataTypeResolver',
	() => {
		it(
			'resolves an exact data type and version',
			() => {
				const handler =
					new FakeDataTypeHandler(
						'example/type',
						1
					);

				const resolver =
					new ResourceDataTypeResolver([
						handler
					]);

				expect(
					resolver.resolve(
						'example/type',
						1
					)
				).toBe(
					handler
				);
			}
		);

		it(
			'rejects an unsupported data type version',
			() => {
				const resolver =
					new ResourceDataTypeResolver([
						new FakeDataTypeHandler(
							'example/type',
							1
						)
					]);

				expect(
					() =>
						resolver.resolve(
							'example/type',
							2
						)
				).toThrow(
					'Unsupported Resource data type: example/type@2'
				);
			}
		);

		it(
			'rejects duplicate registrations',
			() => {
				expect(
					() =>
						new ResourceDataTypeResolver([
							new FakeDataTypeHandler(
								'example/type',
								1
							),
							new FakeDataTypeHandler(
								'example/type',
								1
							)
						])
				).toThrow(
					'Duplicate Resource data type handler: example/type@1'
				);
			}
		);
	}
);
