import type {
	Event
} from 'nostr-typedef';

import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	RESOURCE_KIND
} from '$lib/resource/models/resource.model';

import type {
	ResourceClient
} from './resource-client';

import {
	ResourceDiscovery
} from './resource-discovery';

const PUBLISHER =
	'a'.repeat(64);

const EVENT_ID =
	'b'.repeat(64);

const RESOURCE_ID =
	'kjvonly/bible/chapters/kjv/1_1';

const SECOND_RESOURCE_ID =
	'kjvonly/bible/chapters/kjv/1_2';

describe(
	'ResourceDiscovery',
	() => {
		it(
			'queries a Published Resource by exact Resource Identity',
			async () => {
				const getEvent =
					vi.fn<
						ResourceClient[
							'getEvent'
						]
					>(
						async () =>
							createResourceEvent()
					);

				const discovery =
					new ResourceDiscovery(
						createResourceClient(
							getEvent
						)
					);

				await discovery.get({
					publisher:
						PUBLISHER,

					resourceId:
						RESOURCE_ID
				});

				expect(
					getEvent
				).toHaveBeenCalledOnce();

				expect(
					getEvent
				).toHaveBeenCalledWith({
					kinds: [
						RESOURCE_KIND
					],

					authors: [
						PUBLISHER
					],

					'#d': [
						RESOURCE_ID
					]
				});
			}
		);

		it(
			'returns null when the Published Resource is not found',
			async () => {
				const getEvent =
					vi.fn<
						ResourceClient[
							'getEvent'
						]
					>(
						async () =>
							null
					);

				const discovery =
					new ResourceDiscovery(
						createResourceClient(
							getEvent
						)
					);

				const result =
					await discovery.get({
						publisher:
							PUBLISHER,

						resourceId:
							RESOURCE_ID
					});

				expect(
					result
				).toBeNull();
			}
		);

		it(
			'returns the discovered Resource Representation',
			async () => {
				const getEvent =
					vi.fn<
						ResourceClient[
							'getEvent'
						]
					>(
						async () =>
							createResourceEvent()
					);

				const discovery =
					new ResourceDiscovery(
						createResourceClient(
							getEvent
						)
					);

				const result =
					await discovery.get({
						publisher:
							PUBLISHER,

						resourceId:
							RESOURCE_ID
					});

				expect(
					result
				).toEqual({
					publisher:
						PUBLISHER,

					resourceId:
						RESOURCE_ID,

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
			'queries current Published Resources by publisher and Resource Type',
			async () => {
				const getEvents =
					vi.fn<
						ResourceClient[
							'getEvents'
						]
					>(
						async () => [
							createResourceEvent()
						]
					);

				const discovery =
					new ResourceDiscovery(
						createResourceClient(
							undefined,
							getEvents
						)
					);

				await discovery.listByType(
					PUBLISHER,
					'kjvonly/bible/chapters'
				);

				expect(
					getEvents
				).toHaveBeenCalledWith({
					kinds: [
						RESOURCE_KIND
					],

					authors: [
						PUBLISHER
					],

					'#t': [
						'kjvonly/bible/chapters'
					]
				});
			}
		);

		it(
			'keeps only the newest Resource for each Resource id when relays return multiple addressable-event versions',
			async () => {
				const newest =
					createResourceEvent({
						id:
							'd'.repeat(64),
						createdAt:
							200
					});

				const older =
					createResourceEvent({
						id:
							'e'.repeat(64),
						createdAt:
							100
					});

				const second =
					createResourceEvent({
						id:
							'f'.repeat(64),
						resourceId:
							SECOND_RESOURCE_ID,
						createdAt:
							150
					});

				const discovery =
					new ResourceDiscovery(
						createResourceClient(
							undefined,
							async () => [
								older,
								second,
								newest
							]
						)
					);

				const result =
					await discovery.listByType(
						PUBLISHER,
						'kjvonly/bible/chapters'
					);

				expect(
					result.map(
						(resource) => [
							resource.resourceId,
							resource.eventId
						]
					)
				).toEqual([
					[
						RESOURCE_ID,
						newest.id
					],
					[
						SECOND_RESOURCE_ID,
						second.id
					]
				]);
			}
		);

	}
);

function createResourceClient(
	getEvent:
		ResourceClient['getEvent'] =
			async () => null,

	getEvents:
		ResourceClient['getEvents'] =
			async () => []
): ResourceClient {
	return {
		setDefaultRelays:
			() => {},

		getEvent,

		getEvents,

		publishEvent:
			async () => {
				throw new Error(
					'Not implemented.'
				);
			},

		subscribe:
			() => ({
				close:
					() => {}
			}),

		dispose:
			() => {}
	};
}

function createResourceEvent(
	overrides: {
		readonly id?: string;
		readonly resourceId?: string;
		readonly createdAt?: number;
	} = {}
): Event {
	return {
		id:
			overrides.id ??
			EVENT_ID,

		pubkey:
			PUBLISHER,

		created_at:
			overrides.createdAt ??
			123456,

		kind:
			RESOURCE_KIND,

		tags: [
			[
				'd',
				overrides.resourceId ??
					RESOURCE_ID
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
			'c'.repeat(128)
	};
}