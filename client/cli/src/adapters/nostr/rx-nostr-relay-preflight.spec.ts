import {
	of
} from 'rxjs';

import type {
	RxNostr
} from 'rx-nostr';

import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';


const {
	createNodeRxNostrMock
} =
	vi.hoisted(
		() => ({
			createNodeRxNostrMock:
				vi.fn()
		})
	);


vi.mock(
	'./create-node-rx-nostr.js',
	() => ({
		createNodeRxNostr:
			createNodeRxNostrMock
	})
);


import {
	RxNostrRelayPreflight
} from './rx-nostr-relay-preflight.js';


function createRxNostr(
	state:
		'connected' |
		'error' |
		'rejected'
): RxNostr {

	return {
		createConnectionStateObservable:
			vi.fn(
				() =>
					of({
						state
					})
			),

		setDefaultRelays:
			vi.fn(),

		dispose:
			vi.fn()
	} as unknown as RxNostr;
}


afterEach(
	() => {

		createNodeRxNostrMock
			.mockReset();
	}
);


describe(
	'RxNostrRelayPreflight',
	() => {

		it(
			'checks every configured relay',
			async () => {

				const relayA =
					createRxNostr(
						'connected'
					);


				const relayB =
					createRxNostr(
						'connected'
					);


				createNodeRxNostrMock
					.mockReturnValueOnce(
						relayA
					)
					.mockReturnValueOnce(
						relayB
					);


				const preflight =
					new RxNostrRelayPreflight();


				await preflight.check({
					relays: [
						'wss://relay-a.example',
						'wss://relay-b.example'
					]
				});


				expect(
					createNodeRxNostrMock
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					relayA.setDefaultRelays
				).toHaveBeenCalledWith([
					'wss://relay-a.example'
				]);


				expect(
					relayB.setDefaultRelays
				).toHaveBeenCalledWith([
					'wss://relay-b.example'
				]);


				expect(
					relayA.dispose
				).toHaveBeenCalledOnce();


				expect(
					relayB.dispose
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'fails when any configured relay is unavailable',
			async () => {

				const relayA =
					createRxNostr(
						'connected'
					);


				const relayB =
					createRxNostr(
						'error'
					);


				createNodeRxNostrMock
					.mockReturnValueOnce(
						relayA
					)
					.mockReturnValueOnce(
						relayB
					);


				const preflight =
					new RxNostrRelayPreflight();


				await expect(
					preflight.check({
						relays: [
							'wss://relay-a.example',
							'wss://relay-b.example'
						]
					})
				).rejects.toThrow(
					'Unable to reach Nostr relay "wss://relay-b.example"'
				);


				expect(
					createNodeRxNostrMock
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					relayA.setDefaultRelays
				).toHaveBeenCalledWith([
					'wss://relay-a.example'
				]);


				expect(
					relayB.setDefaultRelays
				).toHaveBeenCalledWith([
					'wss://relay-b.example'
				]);
			}
		);
	}
);