import {
	verifier
} from '@rx-nostr/crypto';

import {
	createRxNostr,
	type RxNostr,
	type RxNostrConfig
} from 'rx-nostr';

import WebSocket from 'ws';


const NOSTR_TIMEOUT_MS =
	5_000;


export function createNodeRxNostr(
	overrides:
		Partial<RxNostrConfig> = {}
): RxNostr {

	return createRxNostr({
		verifier,

		websocketCtor:
			WebSocket,

		connectionStrategy:
			'lazy-keep',

		eoseTimeout:
			NOSTR_TIMEOUT_MS,

		okTimeout:
			NOSTR_TIMEOUT_MS,

		authTimeout:
			NOSTR_TIMEOUT_MS,

		retry: {
			strategy:
				'exponential',

			maxCount:
				5,

			initialDelay:
				1_000,

			polite:
				true
		},

		...overrides
	});
}