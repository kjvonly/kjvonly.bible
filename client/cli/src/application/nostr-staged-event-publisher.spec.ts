import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import type {
	NostrEventStagingRepository
} from '../ports/nostr-event-staging-repository.js';

import type {
	NostrRelayReconciler
} from '../ports/nostr-relay-reconciler.js';

import {
	NostrStagedEventPublisher
} from './nostr-staged-event-publisher.js';


function createManifest() {

	return {
		version:
			1,

		kind:
			37770,

		staging: {
			path:
				'./.kjvonly'
		},

		nostr: {
			relays: [
				'wss://relay-a.example',
				'wss://relay-b.example'
			]
		},

		strategies:
			{},

		resources:
			{},

		collections:
			{}
	} satisfies Manifest;
}


describe(
	'NostrStagedEventPublisher',
	() => {

		it(
			'returns already-present results without reading staged events',
			async () => {

				const publisher =
					'a'.repeat(
						64
					);


				const stagedEvents = [
					{
						path:
							'/staging/events/chapters/1.json',

						eventId:
							'b'.repeat(
								64
							),

						createdAt:
							1000
					},
					{
						path:
							'/staging/events/chapters/2.json',

						eventId:
							'c'.repeat(
								64
							),

						createdAt:
							1001
					}
				];


				const read =
					vi.fn();


				const stagingRepository:
					NostrEventStagingRepository = {
						list:
							vi.fn(
								async () =>
									stagedEvents
							),

						read
					};


				const signer:
					EventSigner = {
						getPublicKey:
							vi.fn(
								async () =>
									publisher
							),

						sign:
							vi.fn()
					};


				const reconcile =
					vi.fn(
						async () =>
							[]
					);


				const reconciler:
					NostrRelayReconciler = {
						reconcile
					};


				const nostrPublisher =
					new NostrStagedEventPublisher(
						stagingRepository,
						signer,
						reconciler
					);


				const results =
					await nostrPublisher.publish(
						createManifest(),
						'/staging'
					);


				expect(
					reconcile
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					reconcile
				).toHaveBeenNthCalledWith(
					1,
					{
						relay:
							'wss://relay-a.example',

						publisher,

						kind:
							37770,

						events: [
							{
								eventId:
									stagedEvents[0]!
										.eventId,

								createdAt:
									1000
							},
							{
								eventId:
									stagedEvents[1]!
										.eventId,

								createdAt:
									1001
							}
						]
					}
				);


				expect(
					read
				).not.toHaveBeenCalled();


				expect(
					results
				).toEqual([
					{
						eventId:
							stagedEvents[0]!
								.eventId,

						relay:
							'wss://relay-a.example',

						status:
							'already-present'
					},
					{
						eventId:
							stagedEvents[1]!
								.eventId,

						relay:
							'wss://relay-a.example',

						status:
							'already-present'
					},
					{
						eventId:
							stagedEvents[0]!
								.eventId,

						relay:
							'wss://relay-b.example',

						status:
							'already-present'
					},
					{
						eventId:
							stagedEvents[1]!
								.eventId,

						relay:
							'wss://relay-b.example',

						status:
							'already-present'
					}
				]);
			}
		);
	}
);