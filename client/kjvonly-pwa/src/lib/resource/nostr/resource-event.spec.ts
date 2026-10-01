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

					modifiedAt:
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
			'uses t as Resource Type independently of d Resource identity',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'my-filesystem'
							],
							[
								't',
								'fs'
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

				expect(result.resourceId)
					.toBe(
						'my-filesystem'
					);

				expect(result.resourceType)
					.toBe(
						'fs'
					);
			}
		);

		it(
			'preserves non-envelope scalar tags as Resource metadata',
			() => {
				const event =
					createResourceEvent({
						tags: [
							[
								'd',
								'my-filesystem'
							],
							[
								't',
								'fs'
							],
							[
								'f',
								'notes'
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
					toResourceRepresentation(
						event
					).metadata
				).toEqual({
					f:
						'notes'
				});
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