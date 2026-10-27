import type {
	VerificationServiceClient
} from '@rx-nostr/crypto';

import {
	createRxNostr,
	type EventSigner,
	type RxNostr,
	type RxNostrConfig
} from 'rx-nostr';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import {
	RxNostrClient
} from './rx-nostr-client';

import {
	createBrowserVerificationClient
} from '../verification-client';

const NOSTR_TIMEOUT_MS =
	5_000;

type RxNostrFactory = (
	config: RxNostrConfig
) => RxNostr;

export function createNostrClient(
	verificationClient:
		VerificationServiceClient,

	signer: EventSigner,

	rxNostrFactory: RxNostrFactory =
		createRxNostr
): NostrClient {
	verificationClient.start();

	const rxNostr =
		rxNostrFactory({
			verifier:
				verificationClient.verifier,

			signer,

			authenticator:
				'auto',

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
			}
		});

	return new RxNostrClient(
		rxNostr,
		signer,
		() =>
			verificationClient.dispose()
	);
}

export function createBrowserNostrClient(
	signer: EventSigner
): NostrClient {
	const verificationClient =
		createBrowserVerificationClient();

	return createNostrClient(
		verificationClient,
		signer
	);
}