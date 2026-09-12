import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GzipResourceContentDecorator
} from './gzip-resource-content-decorator';

import {
	HexResourceContentDecorator
} from './hex-resource-content-decorator';

import {
	JsonResourceContentDecorator
} from './json-resource-content-decorator';

import {
	ResourceContentDecoratorBuilder
} from './resource-content-decorator-builder';

import {
	ResourceContentEncoder
} from './resource-content-encoder';

describe(
	'ResourceContentEncoder',
	() => {
		it(
			'encodes Resource content according to its media type',
			async () => {
				const builder =
					createDecoratorBuilder();

				const encoder =
					new ResourceContentEncoder(
						builder
					);

				const value = {
					chapter:
						1,
					bookName:
						'Genesis'
				};

				const content =
					await encoder.encode({
						publisher:
							'publisher',
						resourceType:
							'kjvonly/example',
						resourceId:
							'kjvonly/example/default/1_1',
						representation:
							'content',
						mediaType:
							'application/json+gzip+hex',
						value
					});

				expect(
					content
				).toMatch(
					/^[0-9a-f]+$/
				);

				const decoded =
					await builder
						.build(
							'application/json+gzip+hex'
						)
						.decode(
							content
						);

				expect(
					decoded
				).toEqual(
					value
				);
			}
		);
	}
);

function createDecoratorBuilder():
	ResourceContentDecoratorBuilder {
	return new ResourceContentDecoratorBuilder([
		{
			token:
				'application/json',

			decorate:
				(inner) =>
					new JsonResourceContentDecorator(
						inner
					)
		},
		{
			token:
				'gzip',

			decorate:
				(inner) =>
					new GzipResourceContentDecorator(
						inner
					)
		},
		{
			token:
				'hex',

			decorate:
				(inner) =>
					new HexResourceContentDecorator(
						inner
					)
		}
	]);
}
