import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createRxNostr
} from 'rx-nostr';

import {
	RxNostrResourceClient
} from './rx-nostr-resource-client';

import {
	ResourceClientError
} from '$lib/resource/nostr/resource-client';

const describeIntegration =
	process.env.NOSTR_INTEGRATION === '1'
		? describe
		: describe.skip;

describeIntegration(
	'RxNostrResourceClient integration',
	() => {
		it(
			'throws ResourceClientError when the relay is unavailable',
			async () => {
				const rxNostr = createRxNostr({
					retry: {
						strategy: 'off'
					},

					eoseTimeout: 500,

					skipFetchNip11: true
				});

				const client =
					new RxNostrResourceClient(
						rxNostr
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
						ResourceClientError
					);
				} finally {
					client.dispose();
				}
			}
		);
	}
);