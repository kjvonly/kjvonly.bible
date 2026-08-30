import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
	JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
	ResourceDescriptorDocumentDecoder
} from './resource-descriptor-document-decoder';

describe(
	'ResourceDescriptorDocumentDecoder',
	() => {

		it(
			'decodes a JSON descriptor document',
			async () => {
				const decoder =
					createDecoder();

				const result =
					await decoder.decode(
						'application/json',
						JSON.stringify([
							{
								metadata: {
									resourceId:
										'resource-a'
								}
							},
							{
								metadata: {
									resourceId:
										'resource-b'
								}
							}
						])
					);

				expect(
					result
				).toEqual([
					{
						metadata: {
							resourceId:
								'resource-a'
						}
					},
					{
						metadata: {
							resourceId:
								'resource-b'
						}
					}
				]);
			}
		);

		it(
			'accepts an empty descriptor document',
			async () => {
				const decoder =
					createDecoder();

				expect(
					await decoder.decode(
						'application/json',
						'[]'
					)
				).toEqual(
					[]
				);
			}
		);

		it(
			'does not validate individual descriptor entries',
			async () => {
				const decoder =
					createDecoder();

				const result =
					await decoder.decode(
						'application/json',
						JSON.stringify([
							{
								valid:
									'structure is checked later'
							},
							null,
							123
						])
					);

				expect(
					result
				).toEqual([
					{
						valid:
							'structure is checked later'
					},
					null,
					123
				]);
			}
		);

		it(
			'rejects a decoded object',
			async () => {
				const decoder =
					createDecoder();

				await expect(
					decoder.decode(
						'application/json',
						JSON.stringify({
							metadata: {}
						})
					)
				).rejects.toThrow(
					'Invalid Resource descriptor document: expected an array.'
				);
			}
		);

		it(
			'rejects a decoded primitive',
			async () => {
				const decoder =
					createDecoder();

				await expect(
					decoder.decode(
						'application/json',
						'"not-an-array"'
					)
				).rejects.toThrow(
					'Invalid Resource descriptor document: expected an array.'
				);
			}
		);

		it(
			'propagates content decoding failures',
			async () => {
				const decoder =
					createDecoder();

				await expect(
					decoder.decode(
						'application/json',
						'not-json'
					)
				).rejects.toThrow();
			}
		);

		it(
			'uses the existing media type decorator chain',
			async () => {
				const decoder =
					createDecoder();

				await expect(
					decoder.decode(
						'application/json+gzip',
						'[]'
					)
				).rejects.toThrow(
					'Unsupported Resource content encoding: gzip'
				);
			}
		);
	}
);

function createDecoder():
	ResourceDescriptorDocumentDecoder {

	const builder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			}
		]);

	return new ResourceDescriptorDocumentDecoder(
		builder
	);
}