import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceContentCodec
} from './resource-content-codec';

import {
	ResourceContentCodecBuilder
} from './resource-content-codec-builder';

describe(
	'ResourceContentCodecBuilder',
	() => {
		it(
			'builds a base content codec',
			() => {
				const codec =
					createCodec();

				const builder =
					new ResourceContentCodecBuilder(
						[
							{
								mediaType:
									'application/json',

								create:
									() =>
										codec
							}
						],
						[]
					);

				expect(
					builder.build(
						'application/json'
					)
				).toBe(
					codec
				);
			}
		);

		it(
			'wraps codecs in MIME suffix order',
			() => {
				const json =
					createCodec();

				const gzip =
					createCodec();

				const hex =
					createCodec();

				const gzipDecorator =
					vi.fn(
						() =>
							gzip
					);

				const hexDecorator =
					vi.fn(
						() =>
							hex
					);

				const builder =
					new ResourceContentCodecBuilder(
						[
							{
								mediaType:
									'application/json',

								create:
									() =>
										json
							}
						],
						[
							{
								suffix:
									'gzip',

								decorate:
									gzipDecorator
							},
							{
								suffix:
									'hex',

								decorate:
									hexDecorator
							}
						]
					);

				const result =
					builder.build(
						'application/json+gzip+hex'
					);

				expect(
					gzipDecorator
				).toHaveBeenCalledWith(
					json
				);

				expect(
					hexDecorator
				).toHaveBeenCalledWith(
					gzip
				);

				expect(
					result
				).toBe(
					hex
				);
			}
		);

		it(
			'rejects an unsupported base media type',
			() => {
				const builder =
					new ResourceContentCodecBuilder(
						[],
						[]
					);

				expect(
					() =>
						builder.build(
							'application/xml'
						)
				).toThrow(
					'Unsupported Resource media type: application/xml'
				);
			}
		);

		it(
			'rejects an unsupported content encoding',
			() => {
				const builder =
					new ResourceContentCodecBuilder(
						[
							{
								mediaType:
									'application/json',

								create:
									createCodec
							}
						],
						[]
					);

				expect(
					() =>
						builder.build(
							'application/json+gzip'
						)
				).toThrow(
					'Unsupported Resource content encoding: gzip'
				);
			}
		);
	}
);

function createCodec():
	ResourceContentCodec {
	return {
		encode:
			async () =>
				'',

		decode:
			async () =>
				undefined
	};
}