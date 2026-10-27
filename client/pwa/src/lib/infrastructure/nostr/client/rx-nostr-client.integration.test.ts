import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createRxNostr
} from 'rx-nostr';

import {
	RxNostrClient
} from './rx-nostr-client';

import {
	NostrClientError
} from '$lib/infrastructure/nostr/client/nostr-client';

const describeIntegration =
	process.env.NOSTR_INTEGRATION === '1'
		? describe
		: describe.skip;

describeIntegration(
	'RxNostrClient integration',
	() => {
		it(
			'throws NostrClientError when the relay is unavailable',
			async () => {
				const rxNostr = createRxNostr({
					retry: {
						strategy: 'off'
					},

					eoseTimeout: 500,

					skipFetchNip11: true
				});

				const client =
					new RxNostrClient(
						rxNostr,
						{
							getPublicKey:
								async () =>
									'a'.repeat(64)
						}
					);

				client.setDefaultRelays([
					{
						url:
							'ws://127.0.0.1:65534',
						read: true,
						write: false
					}
				]);

				try {
					await expect(
						client.getEvent({
							kinds: [37770]
						})
					).rejects.toBeInstanceOf(
						NostrClientError
					);
				} finally {
					client.dispose();
				}
			}
		);
	}
);