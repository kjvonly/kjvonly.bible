import {
	generateSecretKey
} from 'nostr-tools';

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceClient
} from '$lib/resource/nostr/resource-client';

import {
	NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
	createBrowserResourceClient
} from '$lib/infrastructure/nostr/resource-client';

const RELAY_URL =
	import.meta.env
		.VITE_NOSTR_TEST_RELAY_URL ??
	'ws://127.0.0.1:3334';

describe(
	'ResourceClient local relay integration',
	() => {
		let signer:
			NostrSigner;

		let client:
			ResourceClient;

		let pubkey:
			string;

		beforeEach(
			async () => {
				signer =
					new NostrSigner();

				await signer
					.useSecretKey(
						generateSecretKey()
					);

				pubkey =
					await signer
						.getPublicKey();

				client =
					createBrowserResourceClient(
						signer
					);

				client.setDefaultRelays([
					{
						url:
							RELAY_URL,

						read:
							true,

						write:
							true
					}
				]);
			}
		);

		afterEach(
			async () => {
				client.dispose();

				await signer.clear();
			}
		);

		it(
			'publishes an unsigned event and reads the signed event back',
			async () => {
				const testId =
					crypto.randomUUID();

				const resourceId =
					`integration/resource-client/${testId}`;

				const content =
					JSON.stringify({
						test:
							'resource-client',

						id:
							testId
					});

				const publication =
					await client
						.publishEvent({
							kind:
								30001,

							tags: [
								[
									'd',
									resourceId
								]
							],

							content
						});

				expect(
					publication
						.acceptedByAnyRelay
				).toBe(true);

				expect(
					publication
						.acknowledgements
						.some(
							({
								accepted
							}) =>
								accepted
						)
				).toBe(true);

				const event =
					await client
						.getEvent({
							kinds: [
								30001
							],

							authors: [
								pubkey
							],

							'#d': [
								resourceId
							]
						});

				expect(
					event
				).not.toBeNull();

				expect(
					event?.id
				).toBe(
					publication
						.eventId
				);

				expect(
					event?.pubkey
				).toBe(
					pubkey
				);

				expect(
					event?.kind
				).toBe(
					30001
				);

				expect(
					event?.content
				).toBe(
					content
				);

				expect(
					event?.tags
				).toContainEqual([
					'd',
					resourceId
				]);
			}
		);

		it(
			'returns null when the relay is healthy but the event does not exist',
			async () => {
				const resourceId =
					`integration/missing/${crypto.randomUUID()}`;

				const event =
					await client
						.getEvent({
							kinds: [
								30001
							],

							authors: [
								pubkey
							],

							'#d': [
								resourceId
							]
						});

				expect(
					event
				).toBeNull();
			}
		);
	}
);