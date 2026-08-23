import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	from,
	Observable,
	lastValueFrom,
	toArray
} from 'rxjs';

import type {
	Event,
	Filter
} from 'nostr-typedef';

import type {
	EventPacket,
	RxNostr
} from 'rx-nostr';

import {
	RxNostrResourceClient
} from './rx-nostr-resource-client';
import { ResourceClientError } from '$lib/resource/nostr/resource-client';

function createEvent(
	id: string,
	createdAt: number
): Event {
	return {
		id,
		pubkey: 'a'.repeat(64),
		created_at: createdAt,
		kind: 37770,
		tags: [],
		content: '',
		sig: 'b'.repeat(128)
	};
}

function createPacket(
	event: Event,
	from = 'wss://relay.test'
): EventPacket {
	return {
		from,
		type: 'EVENT',
		subId: 'test',
		event,
		message: [
			'EVENT',
			'test',
			event
		]
	};
}

function createRxNostr(
	packets: readonly EventPacket[] = []
): RxNostr {
	return {
		use: vi.fn(() => from(packets)),
		setDefaultRelays: vi.fn(),
		getDefaultRelays: vi.fn(() => ({
			'wss://relay.test/': {
				url: 'wss://relay.test/',
				read: true,
				write: true
			}
		})),

		getRelayStatus: vi.fn(() => ({
			connection: 'connected'
		})),
		dispose: vi.fn()
	} as unknown as RxNostr;
}

describe('RxNostrResourceClient.getEvent', () => {
	it('returns null when no event is found', async () => {
		const rxNostr = createRxNostr([]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvent({
			kinds: [37770]
		});

		expect(result).toBeNull();
	});

	it('returns the matching event', async () => {
		const event = createEvent(
			'a'.repeat(64),
			100
		);

		const rxNostr = createRxNostr([
			createPacket(event)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvent({
			kinds: [37770]
		});

		expect(result).toBe(event);
	});

	it('selects the newest candidate returned by multiple relays', async () => {
		const older = createEvent(
			'a'.repeat(64),
			100
		);

		const newer = createEvent(
			'b'.repeat(64),
			200
		);

		const rxNostr = createRxNostr([
			createPacket(
				older,
				'wss://relay-a.test'
			),
			createPacket(
				newer,
				'wss://relay-b.test'
			)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvent({
			kinds: [37770]
		});

		expect(result?.id).toBe(newer.id);
	});
	it('uses rx-nostr latest-event ordering when timestamps are equal', async () => {
		const lowerId = createEvent(
			'a'.repeat(64),
			100
		);

		const higherId = createEvent(
			'b'.repeat(64),
			100
		);

		const rxNostr = createRxNostr([
			createPacket(lowerId),
			createPacket(higherId)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvent({
			kinds: [37770]
		});

		expect(result?.id).toBe(higherId.id);
	});


	it('adds limit 1 to the Nostr filter', async () => {
		const rxNostr = createRxNostr([]);

		const client =
			new RxNostrResourceClient(rxNostr);

		await client.getEvent({
			kinds: [37770],
			limit: 50
		});

		const use = vi.mocked(rxNostr.use);

		const request = use.mock.calls[0][0];

		const requestPackets =
			await lastValueFrom(
				request
					.getReqPacketObservable()
					.pipe(toArray())
			);

		expect(requestPackets).toHaveLength(1);

		expect(
			requestPackets[0].filters[0].limit
		).toBe(1);
	});

	it('uses only explicitly supplied relays', async () => {
		const rxNostr = createRxNostr([]);

		const client =
			new RxNostrResourceClient(rxNostr);

		await client.getEvent(
			{
				kinds: [37770]
			},
			{
				relays: [
					'wss://resource.test'
				]
			}
		);

		const use = vi.mocked(rxNostr.use);

		expect(
			use.mock.calls[0][1]
		).toEqual({
			on: {
				relays: [
					'wss://resource.test'
				],
				defaultReadRelays: false
			}
		});
	});
});

describe('RxNostrResourceClient.getEvents', () => {
	it('returns an empty array when no events are found', async () => {
		const rxNostr = createRxNostr([]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvents({
			kinds: [37770]
		});

		expect(result).toEqual([]);
	});

	it('deduplicates the same event received from multiple relays', async () => {
		const event = createEvent(
			'a'.repeat(64),
			100
		);

		const rxNostr = createRxNostr([
			createPacket(
				event,
				'wss://relay-a.test'
			),
			createPacket(
				event,
				'wss://relay-b.test'
			)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvents({
			kinds: [37770]
		});

		expect(result).toEqual([
			event
		]);
	});

	it('returns multiple events newest first', async () => {
		const oldest = createEvent(
			'a'.repeat(64),
			100
		);

		const newest = createEvent(
			'b'.repeat(64),
			300
		);

		const middle = createEvent(
			'c'.repeat(64),
			200
		);

		const rxNostr = createRxNostr([
			createPacket(oldest),
			createPacket(newest),
			createPacket(middle)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const result = await client.getEvents({
			kinds: [37770]
		});

		expect(result).toEqual([
			newest,
			middle,
			oldest
		]);
	});

	it('accepts multiple Nostr filters', async () => {
		const rxNostr = createRxNostr([]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const filters: Filter[] = [
			{
				kinds: [37770]
			},
			{
				kinds: [37778]
			}
		];

		await client.getEvents(filters);

		const use = vi.mocked(rxNostr.use);

		const request = use.mock.calls[0][0];

		const requestPackets =
			await lastValueFrom(
				request
					.getReqPacketObservable()
					.pipe(toArray())
			);

		expect(
			requestPackets[0].filters
		).toEqual(filters);
	});
});

describe('RxNostrResourceClient.setDefaultRelays', () => {
	it('configures the rx-nostr default relays', () => {
		const rxNostr = createRxNostr();

		const client =
			new RxNostrResourceClient(rxNostr);

		client.setDefaultRelays([
			{
				url: 'wss://relay-a.test',
				read: true,
				write: true
			},
			{
				url: 'wss://relay-b.test',
				read: true,
				write: false
			}
		]);

		expect(
			rxNostr.setDefaultRelays
		).toHaveBeenCalledWith([
			{
				url: 'wss://relay-a.test',
				read: true,
				write: true
			},
			{
				url: 'wss://relay-b.test',
				read: true,
				write: false
			}
		]);
	});

	it('replaces the default relay configuration when called again', () => {
		const rxNostr = createRxNostr();

		const client =
			new RxNostrResourceClient(rxNostr);

		client.setDefaultRelays([
			{
				url: 'wss://relay-a.test',
				read: true,
				write: true
			}
		]);

		client.setDefaultRelays([
			{
				url: 'wss://relay-b.test',
				read: true,
				write: false
			}
		]);

		expect(
			rxNostr.setDefaultRelays
		).toHaveBeenLastCalledWith([
			{
				url: 'wss://relay-b.test',
				read: true,
				write: false
			}
		]);

		expect(
			rxNostr.setDefaultRelays
		).toHaveBeenCalledTimes(2);
	});
});

describe('RxNostrResourceClient.dispose', () => {
	it('disposes the underlying rx-nostr client', () => {
		const rxNostr = createRxNostr();

		const client =
			new RxNostrResourceClient(rxNostr);

		client.dispose();

		expect(
			rxNostr.dispose
		).toHaveBeenCalledOnce();
	});
});

it('throws when no readable relays are configured', async () => {
	const rxNostr = createRxNostr([]);

	vi.mocked(
		rxNostr.getDefaultRelays
	).mockReturnValue({});

	const client =
		new RxNostrResourceClient(rxNostr);

	await expect(
		client.getEvent({
			kinds: [37770]
		})
	).rejects.toMatchObject({
		name: 'ResourceClientError',
		operation: 'getEvent',
		relays: []
	});
});


describe('RxNostrResourceClient.subscribe', () => {
	it('delivers matching events to the callback', () => {
		const event = createEvent(
			'a'.repeat(64),
			100
		);

		const rxNostr = createRxNostr([
			createPacket(event)
		]);

		const client =
			new RxNostrResourceClient(rxNostr);

		const onEvent = vi.fn();

		client.subscribe(
			{
				kinds: [37770]
			},
			onEvent
		);

		expect(onEvent).toHaveBeenCalledOnce();
		expect(onEvent).toHaveBeenCalledWith(event);
	});

	it('closes the underlying rx-nostr subscription', () => {
		const teardown = vi.fn();

		const rxNostr = {
			use: vi.fn(
				() =>
					new Observable<EventPacket>(() => {
						return teardown;
					})
			),

			getDefaultRelays: vi.fn(() => ({
				'wss://relay.test/': {
					url: 'wss://relay.test/',
					read: true,
					write: true
				}
			})),

			getRelayStatus: vi.fn(() => ({
				connection: 'connected'
			})),

			setDefaultRelays: vi.fn(),
			dispose: vi.fn()
		} as unknown as RxNostr;

		const client =
			new RxNostrResourceClient(rxNostr);

		const subscription =
			client.subscribe(
				{
					kinds: [37770]
				},
				() => { }
			);

		subscription.close();

		expect(teardown).toHaveBeenCalledOnce();
	});

	it('uses only explicitly supplied relays', () => {
		const rxNostr = createRxNostr();

		const client =
			new RxNostrResourceClient(rxNostr);

		client.subscribe(
			{
				kinds: [37770]
			},
			() => { },
			{
				relays: [
					'wss://resource.test'
				]
			}
		);

		expect(
			vi.mocked(rxNostr.use).mock.calls[0][1]
		).toEqual({
			on: {
				relays: [
					'wss://resource.test'
				],
				defaultReadRelays: false
			}
		});
	});


	it('closes the underlying rx-nostr subscription', () => {
		const teardown = vi.fn();

		const rxNostr = {
			use: vi.fn(
				() =>
					new Observable<EventPacket>(() => {
						return teardown;
					})
			),

			getDefaultRelays: vi.fn(() => ({
				'wss://relay.test/': {
					url: 'wss://relay.test/',
					read: true,
					write: true
				}
			})),

			getRelayStatus: vi.fn(() => ({
				connection: 'connected'
			})),

			setDefaultRelays: vi.fn(),
			dispose: vi.fn()
		} as unknown as RxNostr;

		const client =
			new RxNostrResourceClient(rxNostr);

		const subscription =
			client.subscribe(
				{
					kinds: [37770]
				},
				() => { }
			);

		subscription.close();

		expect(teardown).toHaveBeenCalledOnce();
	});

	it('throws when no readable relays are configured', () => {
		const rxNostr = createRxNostr();

		vi.mocked(
			rxNostr.getDefaultRelays
		).mockReturnValue({});

		const client =
			new RxNostrResourceClient(rxNostr);

		expect(() =>
			client.subscribe(
				{
					kinds: [37770]
				},
				() => { }
			)
		).toThrow(ResourceClientError);
	});
});

