import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceDescriptorValidator
} from './resource-descriptor-validator';

const PUBLISHER =
	'a'.repeat(
		64
	);

describe(
	'ResourceDescriptorValidator',
	() => {

		it(
			'validates a Resource descriptor',
			() => {
				const validator =
					new ResourceDescriptorValidator();

				const descriptor =
					validator.validate(
						createDescriptor()
					);

				expect(
					descriptor
				).toEqual({
					metadata: {
						publisher:
							PUBLISHER,

						resourceId:
							'kjvonly/bible/chapters/kjvs',

						category:
							'kjvonly/bible/chapters',

						modifiedAt:
							100,

						mediaType:
							'application/json+gzip'
					},

					strategy: {
						type:
							'blossom',

						data: {
							url:
								'https://example.com/resource'
						}
					}
				});
			}
		);

		it(
			'rejects a non-object descriptor',
			() => {
				const validator =
					new ResourceDescriptorValidator();

				expect(
					() =>
						validator.validate(
							null
						)
				).toThrow(
					'Invalid Resource descriptor.'
				);
			}
		);

		it(
			'requires metadata',
			() => {
				expectInvalid({
					strategy:
						createStrategy()
				});
			}
		);

		it(
			'requires a valid publisher',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							publisher:
								'publisher'
						}
					})
				);
			}
		);

		it(
			'rejects a non-canonical publisher',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							publisher:
								'A'.repeat(
									64
								)
						}
					})
				);
			}
		);

		it(
			'requires resourceId',
			() => {
				const metadata = {
					...createMetadata()
				};

				delete (
					metadata as
						Partial<
							ReturnType<
								typeof createMetadata
							>
						>
				).resourceId;

				expectInvalid(
					createDescriptor({
						metadata
					})
				);
			}
		);

		it(
			'rejects an invalid Resource Identifier',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							resourceId:
								'kjvonly/bible'
						}
					})
				);
			}
		);

		it(
			'requires category to match the Resource Type',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							category:
								'kjvonly/strongs/definitions'
						}
					})
				);
			}
		);

		it(
			'requires modifiedAt to be a number',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							modifiedAt:
								'100'
						}
					})
				);
			}
		);

		it(
			'rejects a negative modifiedAt',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							modifiedAt:
								-1
						}
					})
				);
			}
		);

		it(
			'rejects a non-integer modifiedAt',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							modifiedAt:
								100.5
						}
					})
				);
			}
		);

		it(
			'requires mediaType',
			() => {
				expectInvalid(
					createDescriptor({
						metadata: {
							...createMetadata(),

							mediaType:
								''
						}
					})
				);
			}
		);

		it(
			'requires strategy',
			() => {
				expectInvalid({
					metadata:
						createMetadata()
				});
			}
		);

		it(
			'requires strategy type',
			() => {
				expectInvalid(
					createDescriptor({
						strategy: {
							type:
								'',

							data:
								{}
						}
					})
				);
			}
		);

		it(
			'requires strategy data to be present',
			() => {
				expectInvalid(
					createDescriptor({
						strategy: {
							type:
								'blossom'
						}
					})
				);
			}
		);

		it(
			'does not validate strategy-specific data',
			() => {
				const validator =
					new ResourceDescriptorValidator();

				const descriptor =
					validator.validate(
						createDescriptor({
							strategy: {
								type:
									'blossom',

								data:
									null
							}
						})
					);

				expect(
					descriptor.strategy
						.data
				).toBeNull();
			}
		);

		it(
			'does not require the strategy type to be supported',
			() => {
				const validator =
					new ResourceDescriptorValidator();

				const descriptor =
					validator.validate(
						createDescriptor({
							strategy: {
								type:
									'future-strategy',

								data:
									{}
							}
						})
					);

				expect(
					descriptor.strategy
						.type
				).toBe(
					'future-strategy'
				);
			}
		);
	}
);

function expectInvalid(
	value: unknown
): void {

	const validator =
		new ResourceDescriptorValidator();

	expect(
		() =>
			validator.validate(
				value
			)
	).toThrow();
}

function createDescriptor(
	overrides:
		Record<
			string,
			unknown
		> =
			{}
): Record<string, unknown> {

	return {
		metadata:
			createMetadata(),

		strategy:
			createStrategy(),

		...overrides
	};
}

function createMetadata():
	Record<string, unknown> {

	return {
		publisher:
			PUBLISHER,

		resourceId:
			'kjvonly/bible/chapters/kjvs',

		category:
			'kjvonly/bible/chapters',

		modifiedAt:
			100,

		mediaType:
			'application/json+gzip'
	};
}

function createStrategy():
	Record<string, unknown> {

	return {
		type:
			'blossom',

		data: {
			url:
				'https://example.com/resource'
		}
	};
}