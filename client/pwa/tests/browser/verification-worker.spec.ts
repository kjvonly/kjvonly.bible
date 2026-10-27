import type {
	VerificationServiceClient
} from '@rx-nostr/crypto';

import {
	finalizeEvent,
	generateSecretKey
} from 'nostr-tools';

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	createBrowserVerificationClient
} from '$lib/infrastructure/nostr/verification-client';

describe(
	'Nostr verification worker',
	() => {
		let verificationClient:
			VerificationServiceClient;

		beforeEach(() => {
			verificationClient =
				createBrowserVerificationClient();
		});

		afterEach(() => {
			verificationClient.dispose();
		});

		it(
			'starts the real verification worker',
			async () => {
				expect(
					verificationClient.status
				).toBe(
					'prepared'
				);

				verificationClient.start();

				expect(
					verificationClient.status
				).toBe(
					'booting'
				);

				await waitForActive(
					verificationClient
				);

				expect(
					verificationClient.status
				).toBe(
					'active'
				);
			}
		);

		it(
			'verifies valid events and rejects tampered events in the worker',
			async () => {
				verificationClient.start();

				await waitForActive(
					verificationClient
				);

				const event =
					finalizeEvent(
						{
							kind:
								37770,

							created_at:
								100,

							tags: [
								[
									'd',
									'integration/verification-worker'
								]
							],

							content:
								'worker verification test'
						},
						generateSecretKey()
					);

				expect(
					await verificationClient
						.verifier(
							event
						)
				).toBe(true);

				const tamperedEvent = {
					...event,

					content:
						'tampered content'
				};

				expect(
					await verificationClient
						.verifier(
							tamperedEvent
						)
				).toBe(false);
			}
		);
	}
);

async function waitForActive(
	client: VerificationServiceClient,
	timeoutMs = 5_000
): Promise<void> {
	const deadline =
		performance.now() +
		timeoutMs;

	while (true) {
		const status =
			client.status;

		switch (status) {
			case 'active':
				return;

			case 'error':
				throw new Error(
					'Verification worker entered the error state.'
				);

			case 'terminated':
				throw new Error(
					'Verification worker terminated before becoming active.'
				);

			case 'prepared':
			case 'booting':
				break;
		}

		if (
			performance.now() >=
			deadline
		) {
			throw new Error(
				`Verification worker did not become active within ${timeoutMs}ms.`
			);
		}

		await delay(10);
	}
}

function delay(
	ms: number
): Promise<void> {
	return new Promise(
		(resolve) => {
			setTimeout(
				resolve,
				ms
			);
		}
	);
}