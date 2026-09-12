import {
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Logger
} from '#ports/logging/logger.js';

import type {
	EventSigner
} from '#ports/nostr/event-signer.js';

import type {
	NostrToolsAuthSigner
} from '../auth/nostr-tools-auth-signer.js';

import {
	NostrToolsNegentropyError,
	reconcileNostrToolsNegentropy
} from '../negentropy/nostr-tools-negentropy-session.js';

import {
	NostrToolsRelayReconciler
} from './nostr-tools-relay-reconciler.js';


vi.mock(
	'../negentropy/nostr-tools-negentropy-session.js',
	async importOriginal => {
		const actual =
			await importOriginal<
				typeof import('../negentropy/nostr-tools-negentropy-session.js')
			>();


		return {
			...actual,
			reconcileNostrToolsNegentropy:
				vi.fn()
		};
	}
);


function createSigner():
	EventSigner {

	return {
		getPublicKey:
			vi.fn(
				async () =>
					'c'.repeat(
						64
					)
			),

		sign:
			vi.fn()
	};
}


function createLogger():
	Logger {

	return {
		verbose:
			vi.fn()
	};
}


function createRelay() {
	return {
		prepareSubscription:
			vi.fn(
				() => ({
					id:
						'negentropy:1',

					oncustom:
						undefined,

					close:
						vi.fn()
				})
			),

		send:
			vi.fn(
				async () => { }
			),

		auth:
			vi.fn(
				async (
					_signAuthEvent:
						NostrToolsAuthSigner
				) =>
					'authenticated'
			),

		close:
			vi.fn()
	};
}


const mockedReconcileNegentropy =
	vi.mocked(
		reconcileNostrToolsNegentropy
	);


describe(
	'NostrToolsRelayReconciler',
	() => {

		beforeEach(
			() => {
				mockedReconcileNegentropy
					.mockReset();
			}
		);

		it(
			'reconciles one relay and closes the connection',
			async () => {
				const publisher =
					'c'.repeat(
						64
					);

				const localId =
					'a'.repeat(
						64
					);

				const relay =
					createRelay();

				const connectRelay =
					vi.fn(
						async () =>
							relay
					);


				mockedReconcileNegentropy
					.mockResolvedValueOnce([
						localId
					]);


				const reconciler =
					new NostrToolsRelayReconciler(
						createSigner(),
						connectRelay,
						createLogger()
					);


				await expect(
					reconciler.reconcile({
						relay:
							'wss://relay.example',

						publisher,

						kind:
							37770,

						events: [
							{
								eventId:
									localId,

								createdAt:
									1000
							}
						]
					})
				).resolves.toEqual([
					localId
				]);


				expect(
					connectRelay
				).toHaveBeenCalledWith(
					'wss://relay.example'
				);

				expect(
					mockedReconcileNegentropy
				).toHaveBeenCalledOnce();

				expect(
					mockedReconcileNegentropy
						.mock.calls[0]?.[2]
				).toEqual({
					ids: [
						localId
					],

					authors: [
						publisher
					],

					kinds: [
						37770
					]
				});

				expect(
					relay.auth
				).not.toHaveBeenCalled();

				expect(
					relay.close
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'reconciles large event sets in exact-id batches',
			async () => {
				const publisher =
					'c'.repeat(
						64
					);

				const events =
					Array.from(
						{
							length:
								51
						},
						(
							_,
							index
						) => ({
							eventId:
								(index + 1)
									.toString(
										16
									)
									.padStart(
										64,
										'0'
									),

							createdAt:
								1000 +
								index
						})
					);

				const firstMissingId =
					events[10]!
						.eventId;

				const secondMissingId =
					events[50]!
						.eventId;

				const relay =
					createRelay();


				mockedReconcileNegentropy
					.mockResolvedValueOnce([
						firstMissingId
					])
					.mockResolvedValueOnce([
						secondMissingId
					]);


				const reconciler =
					new NostrToolsRelayReconciler(
						createSigner(),
						async () =>
							relay,
						createLogger()
					);


				await expect(
					reconciler.reconcile({
						relay:
							'wss://relay.example',

						publisher,

						kind:
							37770,

						events
					})
				).resolves.toEqual([
					firstMissingId,
					secondMissingId
				]);


				expect(
					mockedReconcileNegentropy
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					mockedReconcileNegentropy
						.mock.calls[0]?.[2]
				).toEqual({
					ids:
						events
							.slice(
								0,
								50
							)
							.map(
								event =>
									event.eventId
							),

					authors: [
						publisher
					],

					kinds: [
						37770
					]
				});

				expect(
					mockedReconcileNegentropy
						.mock.calls[1]?.[2]
				).toEqual({
					ids: [
						events[50]!
							.eventId
					],

					authors: [
						publisher
					],

					kinds: [
						37770
					]
				});

				expect(
					relay.auth
				).not.toHaveBeenCalled();

				expect(
					relay.close
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'closes the relay when reconciliation fails',
			async () => {
				const relay =
					createRelay();


				mockedReconcileNegentropy
					.mockRejectedValueOnce(
						new Error(
							'reconciliation failed'
						)
					);


				const reconciler =
					new NostrToolsRelayReconciler(
						createSigner(),
						async () =>
							relay,
						createLogger()
					);


				await expect(
					reconciler.reconcile({
						relay:
							'wss://relay.example',

						publisher:
							'a'.repeat(
								64
							),

						kind:
							37770,

						events:
							[]
					})
				).rejects.toThrow(
					'reconciliation failed'
				);


				expect(
					relay.auth
				).not.toHaveBeenCalled();

				expect(
					relay.close
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'authenticates and retries once when reconciliation requires auth',
			async () => {
				const publisher =
					'c'.repeat(
						64
					);

				const localId =
					'a'.repeat(
						64
					);

				const relay =
					createRelay();


				mockedReconcileNegentropy
					.mockRejectedValueOnce(
						new NostrToolsNegentropyError(
							'auth-required: authentication required'
						)
					)
					.mockResolvedValueOnce([
						localId
					]);


				const reconciler =
					new NostrToolsRelayReconciler(
						createSigner(),
						async () =>
							relay,
						createLogger()
					);


				await expect(
					reconciler.reconcile({
						relay:
							'wss://relay.example',

						publisher,

						kind:
							37770,

						events: [
							{
								eventId:
									localId,

								createdAt:
									1000
							}
						]
					})
				).resolves.toEqual([
					localId
				]);


				expect(
					relay.auth
				).toHaveBeenCalledOnce();

				expect(
					typeof relay.auth
						.mock.calls[0]?.[0]
				).toBe(
					'function'
				);

				expect(
					mockedReconcileNegentropy
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					relay.close
				).toHaveBeenCalledOnce();
			}
		);


		it(
			'does not retry authentication more than once',
			async () => {
				const relay =
					createRelay();

				const authRequired =
					new NostrToolsNegentropyError(
						'auth-required: authentication required'
					);


				mockedReconcileNegentropy
					.mockRejectedValueOnce(
						authRequired
					)
					.mockRejectedValueOnce(
						authRequired
					);


				const reconciler =
					new NostrToolsRelayReconciler(
						createSigner(),
						async () =>
							relay,
						createLogger()
					);


				await expect(
					reconciler.reconcile({
						relay:
							'wss://relay.example',

						publisher:
							'c'.repeat(
								64
							),

						kind:
							37770,

						events:
							[]
					})
				).rejects.toThrow(
					'Relay rejected Negentropy reconciliation: auth-required: authentication required'
				);


				expect(
					relay.auth
				).toHaveBeenCalledOnce();

				expect(
					mockedReconcileNegentropy
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					relay.close
				).toHaveBeenCalledOnce();
			}
		);
	}
);
