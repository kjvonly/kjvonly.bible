import {
	describe,
	expect,
	it
} from 'vitest';

import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';

import {
	NostrEventResourceDescriptorBuilder
} from './nostr-event-resource-descriptor-builder.js';


function createEvent(
	tags:
		string[][]
): SignedNostrEvent {

	return {
		id:
			'a'.repeat(
				64
			),

		pubkey:
			'b'.repeat(
				64
			),

		created_at:
			123,

		kind:
			37770,

		tags,

		content:
			'content',

		sig:
			'c'.repeat(
				128
			)
	};
}


function createResourceTags(
	representation:
		'content' | 'descriptors' = 'content'
): string[][] {

	return [
		[
			'd',
			'kjvonly/test/resource/example'
		],
		[
			'm',
			'application/json+hex'
		],
		[
			't',
			'test/resource'
		],
		[
			'dataType',
			'kjvonly.test'
		],
		[
			'dataVersion',
			'1'
		],
		[
			'representation',
			representation
		],
		[
			'version',
			'test-v1'
		]
	];
}


describe(
	'NostrEventResourceDescriptorBuilder',
	() => {

		it(
			'projects a content Resource event into a Nostr-backed descriptor',
			() => {

				const builder =
					new NostrEventResourceDescriptorBuilder();


				const descriptor =
					builder.build({
						resourceName:
							'example',

						event:
							createEvent(
								createResourceTags()
							),

						relays: [
							'wss://relay.example'
						]
					});


				expect(
					descriptor
				).toEqual({
					metadata: {
						publisher:
							'b'.repeat(
								64
							),

						resourceId:
							'kjvonly/test/resource/example',

						resourceType:
							'test/resource',

						dataType:
							'kjvonly.test',

						dataVersion:
							1,

						modifiedAt:
							123,

						representation:
							'content',

						mediaType:
							'application/json+hex'
					},

					resourceMetadata: {
						version:
							'test-v1'
					},

					strategy: {
						type:
							'nostr',

						data: {
							kind:
								37770,

							relays: [
								'wss://relay.example'
							]
						}
					}
				});
			}
		);


		it(
			'preserves descriptors representation without interpreting its content',
			() => {

				const builder =
					new NostrEventResourceDescriptorBuilder();


				const descriptor =
					builder.build({
						resourceName:
							'example',

						event:
							createEvent(
								createResourceTags(
									'descriptors'
								)
							),

						relays: []
					});


				expect(
					descriptor
						.metadata
						.representation
				).toBe(
					'descriptors'
				);
			}
		);


		it(
			'rejects duplicate required Resource-envelope tags',
			() => {

				const builder =
					new NostrEventResourceDescriptorBuilder();


				expect(
					() =>
						builder.build({
							resourceName:
								'example',

							event:
								createEvent([
									...createResourceTags(),
									[
										'd',
										'duplicate'
									]
								]),

							relays: []
						})
				).toThrow(
					'Resource "example" requires exactly one "d" tag.'
				);
			}
		);


		it(
			'rejects an invalid semantic data version',
			() => {

				const builder =
					new NostrEventResourceDescriptorBuilder();


				const tags =
					createResourceTags()
						.map(
							tag =>
								tag[0] ===
									'dataVersion'
									? [
										'dataVersion',
										'0'
									]
									: tag
						);


				expect(
					() =>
						builder.build({
							resourceName:
								'example',

							event:
								createEvent(
									tags
								),

							relays: []
						})
				).toThrow(
					'Resource "example" has an invalid "dataVersion" tag.'
				);
			}
		);


		it(
			'rejects an unsupported Resource representation',
			() => {

				const builder =
					new NostrEventResourceDescriptorBuilder();


				const tags =
					createResourceTags()
						.map(
							tag =>
								tag[0] ===
									'representation'
									? [
										'representation',
										'unknown'
									]
									: tag
						);


				expect(
					() =>
						builder.build({
							resourceName:
								'example',

							event:
								createEvent(
									tags
								),

							relays: []
						})
				).toThrow(
					'Resource "example" has an invalid "representation" tag.'
				);
			}
		);
	}
);
