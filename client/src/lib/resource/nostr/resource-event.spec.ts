import type {
	Event
} from 'nostr-typedef';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	RESOURCE_KIND
} from '$lib/resource/models/resource.model';

import {
	toResourceRepresentation
} from './resource-event';

const PUBLISHER =
	'a'.repeat(64);

const EVENT_ID =
	'b'.repeat(64);

describe(
	'toResourceRepresentation',
	() => {
		it(
			'maps a valid Nostr Resource event',
			() => {
				const event =
					createResourceEvent();

				const result =
					toResourceRepresentation(
						event
					);

				expect(
					result
				).toEqual({
					publisher:
						PUBLISHER,

					resourceId:
						'kjvonly/bible/chapters/kjv/1_1',

					resourceType:
						'kjvonly/bible/chapters',

					eventId:
						EVENT_ID,

					createdAt:
						123456,

					representation:
						'content',

					mediaType:
						'application/json',

					payload:
						'{"chapter":1}'
				});
			}
		);

		it(
			'derives Resource Type from the first three Resource Identifier segments',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/plans/readings/365-bible/v1'
							],
							[
								't',
								'kjvonly/plans/readings'
							],
							[
								'representation',
								'content'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				const result =
					toResourceRepresentation(
						event
					);

				expect(
					result.resourceType
				).toBe(
					'kjvonly/plans/readings'
				);
			}
		);

		it(
			'rejects a non-Resource event kind',
			() => {
				const event =
					createResourceEvent({
						kind:
							30001
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Invalid Resource kind'
				);
			}
		);

		it(
			'requires a d tag',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								't',
								'kjvonly/bible/chapters'
							],
							[
								'representation',
								'content'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Resource event is missing d tag.'
				);
			}
		);

		it(
			'rejects a Resource Identifier without a Resource Type',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible'
							],
							[
								't',
								'kjvonly/bible'
							],
							[
								'representation',
								'content'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Invalid Resource Identifier'
				);
			}
		);

		it(
			'requires a t classification tag',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible/chapters/kjv/1_1'
							],
							[
								'representation',
								'content'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Resource event is missing t tag.'
				);
			}
		);

		it(
			'requires the t classification to match the Resource Type',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible/chapters/kjv/1_1'
							],
							[
								't',
								'kjvonly/bible/strongs'
							],
							[
								'representation',
								'content'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Invalid Resource classification'
				);
			}
		);

		it(
			'requires a representation tag',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible/chapters/kjv/1_1'
							],
							[
								't',
								'kjvonly/bible/chapters'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Resource event is missing representation tag.'
				);
			}
		);

		it(
			'rejects an unsupported representation',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible/chapters/kjv/1_1'
							],
							[
								't',
								'kjvonly/bible/chapters'
							],
							[
								'representation',
								'something-else'
							],
							[
								'm',
								'application/json'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Invalid Resource representation'
				);
			}
		);

		it(
			'requires a media type',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'kjvonly/bible/chapters/kjv/1_1'
							],
							[
								't',
								'kjvonly/bible/chapters'
							],
							[
								'representation',
								'content'
							]
						]
					});

				expect(
					() =>
						toResourceRepresentation(
							event
						)
				).toThrow(
					'Resource event is missing m tag.'
				);
			}
		);
	}
);

function createResourceEvent(
	overrides:
		Partial<Event> = {}
): Event {
	return {
		id:
			EVENT_ID,

		pubkey:
			PUBLISHER,

		created_at:
			123456,

		kind:
			RESOURCE_KIND,

		tags: [
			[
				'd',
				'kjvonly/bible/chapters/kjv/1_1'
			],
			[
				't',
				'kjvonly/bible/chapters'
			],
			[
				'representation',
				'content'
			],
			[
				'm',
				'application/json'
			]
		],

		content:
			'{"chapter":1}',

		sig:
			'c'.repeat(128),

		...overrides
	};
}