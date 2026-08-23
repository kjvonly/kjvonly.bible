import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	VerificationServiceClient
} from '@rx-nostr/crypto';

import type {
	EventSigner,
	RxNostr
} from 'rx-nostr';

import {
	createResourceClient
} from './resource-client';

function createVerificationClient():
	VerificationServiceClient {
	return {
		start:
			vi.fn(),

		verifier:
			vi.fn(
				async () => true
			),

		get status() {
			return 'active' as const;
		},

		dispose:
			vi.fn(),

		[Symbol.dispose]:
			vi.fn()
	} as unknown as VerificationServiceClient;
}

function createSigner():
	EventSigner {
	return {
		getPublicKey:
			vi.fn(),

		signEvent:
			vi.fn()
	} as unknown as EventSigner;
}

function createRxNostr():
	RxNostr {
	return {
		dispose:
			vi.fn()
	} as unknown as RxNostr;
}

describe(
	'createResourceClient',
	() => {
		it(
			'starts verification and configures rx-nostr with its verifier',
			() => {
				const verificationClient =
					createVerificationClient();

				const signer =
					createSigner();

				const rxNostr =
					createRxNostr();

				const rxNostrFactory =
					vi.fn(
						() => rxNostr
					);

				createResourceClient(
					verificationClient,
					signer,
					rxNostrFactory
				);

				expect(
					verificationClient
						.start
				).toHaveBeenCalledOnce();

				expect(
					rxNostrFactory
				).toHaveBeenCalledWith({
					verifier:
						verificationClient
							.verifier,

					signer,

					authenticator:
						'auto',

					connectionStrategy:
						'lazy-keep',

					eoseTimeout:
						5_000,

					okTimeout:
						5_000,

					authTimeout:
						5_000,

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
			}
		);

		it(
			'does not wait for the verification worker before creating rx-nostr',
			() => {
				const verificationClient = {
					...createVerificationClient(),

					get status() {
						return 'booting' as const;
					}
				} as VerificationServiceClient;

				const rxNostrFactory =
					vi.fn(
						() =>
							createRxNostr()
					);

				createResourceClient(
					verificationClient,
					createSigner(),
					rxNostrFactory
				);

				expect(
					rxNostrFactory
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'disposes rx-nostr and the verification client together',
			() => {
				const verificationClient =
					createVerificationClient();

				const rxNostr =
					createRxNostr();

				const client =
					createResourceClient(
						verificationClient,
						createSigner(),
						() => rxNostr
					);

				client.dispose();

				expect(
					rxNostr.dispose
				).toHaveBeenCalledOnce();

				expect(
					verificationClient
						.dispose
				).toHaveBeenCalledOnce();
			}
		);
	}
);