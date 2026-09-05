import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NostrToolsRelayPreflight
} from './nostr-tools-relay-preflight.js';


describe(
	'NostrToolsRelayPreflight',
	() => {

		it(
			'checks every configured relay',
			async () => {

				const relayA = {
					close:
						vi.fn(),

					prepareSubscription:
						vi.fn(),

					send:
						vi.fn()
				};


				const relayB = {
					close:
						vi.fn(),

					prepareSubscription:
						vi.fn(),

					send:
						vi.fn()
				};


				const connectRelay =
					vi.fn(
						async (
							url:
								string
						) => {

							if (
								url ===
									'wss://relay-a.example'
							) {
								return relayA;
							}


							return relayB;
						}
					);


				const preflight =
					new NostrToolsRelayPreflight(
						connectRelay
					);


				await preflight.check({
					relays: [
						'wss://relay-a.example',
						'wss://relay-b.example'
					]
				});


				expect(
					connectRelay
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					connectRelay
				).toHaveBeenCalledWith(
					'wss://relay-a.example'
				);


				expect(
					connectRelay
				).toHaveBeenCalledWith(
					'wss://relay-b.example'
				);


				expect(
					relayA.close
				).toHaveBeenCalledOnce();


				expect(
					relayB.close
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'fails when any configured relay is unavailable',
			async () => {

				const relayA = {
					close:
						vi.fn(),

					prepareSubscription:
						vi.fn(),

					send:
						vi.fn()
				};


				const connectRelay =
					vi.fn(
						async (
							url:
								string
						) => {

							if (
								url ===
									'wss://relay-b.example'
							) {
								throw new Error(
									'connection failed'
								);
							}


							return relayA;
						}
					);


				const preflight =
					new NostrToolsRelayPreflight(
						connectRelay
					);


				await expect(
					preflight.check({
						relays: [
							'wss://relay-a.example',
							'wss://relay-b.example'
						]
					})
				).rejects.toThrow(
					'Unable to reach Nostr relay "wss://relay-b.example": connection failed'
				);


				expect(
					connectRelay
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					relayA.close
				).toHaveBeenCalledOnce();
			}
		);
	}
);