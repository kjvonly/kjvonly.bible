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
	ResourceClient
} from '$lib/resource/nostr/resource-client';

import {
	RxNostrResourceClient
} from './rx-nostr-resource-client';

import {
	createBrowserVerificationClient
} from './verification-client';

const NOSTR_TIMEOUT_MS =
	5_000;

type RxNostrFactory = (
	config: RxNostrConfig
) => RxNostr;

export function createResourceClient(
	verificationClient:
		VerificationServiceClient,

	signer: EventSigner,

	rxNostrFactory: RxNostrFactory =
		createRxNostr
): ResourceClient {
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

	return new RxNostrResourceClient(
		rxNostr,
		() =>
			verificationClient.dispose()
	);
}

export function createBrowserResourceClient(
	signer: EventSigner
): ResourceClient {
	const verificationClient =
		createBrowserVerificationClient();

	return createResourceClient(
		verificationClient,
		signer
	);
}