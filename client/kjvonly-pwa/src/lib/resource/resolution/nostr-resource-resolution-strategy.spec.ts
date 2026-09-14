import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Event
} from 'nostr-typedef';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import {
	NostrResourceResolutionStrategy
} from './nostr-resource-resolution-strategy';

const PUBLISHER =
	'a'.repeat(
		64
	);

const RESOURCE_ID =
	'kjvonly/plans/readings/default';

const RESOURCE_TYPE =
	'kjvonly/plans/readings';

const RESOURCE_KIND =
	37770;

const RELAYS = [
	'wss://relay.example'
];

const CONTENT =
	'5b5d';

describe(
	'NostrResourceResolutionStrategy',
	() => {
		it(
			'uses the nostr strategy type',
			() => {
				const strategy =
					new NostrResourceResolutionStrategy({
						getEvent:
							async () =>
								null
					});

				expect(
					strategy.type
				).toBe(
					'nostr'
				);
			}
		);

		it(
			'resolves serialized Resource content through descriptor Nostr strategy data',
			async () => {
				const event =
					createEvent();

				const getEvent =
					vi.fn(
						async () =>
							event
					);

				const strategy =
					new NostrResourceResolutionStrategy({
						getEvent
					});

				const result =
					await strategy.resolve(
						createDescriptor()
					);

				expect(
					getEvent
				).toHaveBeenCalledWith(
					{
						kinds: [
							RESOURCE_KIND
						],

						authors: [
							PUBLISHER
						],

						'#d': [
							RESOURCE_ID
						]
					},
					{
						relays:
							RELAYS
					}
				);

				expect(
					result
				).toEqual(
					new TextEncoder()
						.encode(
							CONTENT
						)
				);
			}
		);

		it(
			'requires strategy data to be an object',
			async () => {
				const strategy =
					createStrategy();

				await expect(
					strategy.resolve(
						createDescriptor(
							null
						)
					)
				).rejects.toThrow(
					'Invalid Nostr strategy data.'
				);
			}
		);

		it(
			'requires a valid Nostr kind',
			async () => {
				const strategy =
					createStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							kind:
								-1,

							relays:
								RELAYS
						})
					)
				).rejects.toThrow(
					'Invalid Nostr strategy kind.'
				);
			}
		);

		it(
			'requires valid relay URLs',
			async () => {
				const strategy =
					createStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							kind:
								RESOURCE_KIND,

							relays: [
								'https://relay.example'
							]
						})
					)
				).rejects.toThrow(
					'Invalid Nostr strategy relays.'
				);
			}
		);

		it(
			'reports a missing Nostr Resource',
			async () => {
				const strategy =
					createStrategy();

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Nostr Resource not found.'
				);
			}
		);

		it(
			'rejects a Nostr Resource whose metadata does not match the descriptor',
			async () => {
				const strategy =
					new NostrResourceResolutionStrategy({
						getEvent:
							async () =>
								createEvent({
									created_at:
										101
								})
					});

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Nostr Resource modifiedAt mismatch.'
				);
			}
		);

		it(
			'rejects a Nostr Resource whose representation does not match the descriptor',
			async () => {
				const strategy =
					new NostrResourceResolutionStrategy({
						getEvent:
							async () =>
								createEvent({
									tags: [
										['d', RESOURCE_ID],
										['t', RESOURCE_TYPE],
										['representation', 'content'],
										['m', 'application/json+hex']
									]
								})
					});

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Nostr Resource representation mismatch.'
				);
			}
		);
	}
);

function createStrategy():
	NostrResourceResolutionStrategy {
	return new NostrResourceResolutionStrategy({
		getEvent:
			async () =>
				null
	});
}

function createDescriptor(
	strategyData: unknown = {
		kind:
			RESOURCE_KIND,

		relays:
			RELAYS
	}
): ResourceDescriptor {
	return {
		metadata: {
			publisher:
				PUBLISHER,

			resourceId:
				RESOURCE_ID,

			category:
				RESOURCE_TYPE,

			modifiedAt:
				100,

			representation:
				'descriptors',

			mediaType:
				'application/json+hex'
		},

		strategy: {
			type:
				'nostr',

			data:
				strategyData
		}
	};
}

function createEvent(
	overrides:
		Partial<Event> =
		{}
): Event {
	return {
		id:
			'b'.repeat(
				64
			),

		pubkey:
			PUBLISHER,

		created_at:
			100,

		kind:
			RESOURCE_KIND,

		tags: [
			['d', RESOURCE_ID],
			['t', RESOURCE_TYPE],
			['representation', 'descriptors'],
			['m', 'application/json+hex']
		],

		content:
			CONTENT,

		sig:
			'c'.repeat(
				128
			),

		...overrides
	};
}
