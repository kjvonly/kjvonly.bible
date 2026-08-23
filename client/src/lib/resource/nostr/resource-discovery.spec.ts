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
	}
);

function createResourceClient(
	getEvent:
		ResourceClient['getEvent']
): ResourceClient {
	return {
		setDefaultRelays:
			() => {},

		getEvent,

		getEvents:
			async () => [],

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

function createResourceEvent():
	Event {
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