import type {
	Manifest
} from '../domain/manifest.js';

import type {
	NostrPublicationResult
} from '../domain/nostr-publication-result.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import type {
	NostrEventStagingRepository
} from '../ports/nostr-event-staging-repository.js';

import type {
	NostrRelayReconciler
} from '../ports/nostr-relay-reconciler.js';


export class NostrStagedEventPublisher {

	constructor(
		private readonly stagingRepository:
			NostrEventStagingRepository,

		private readonly signer:
			EventSigner,

		private readonly reconciler:
			NostrRelayReconciler
	) {}


	async publish(
		manifest:
			Manifest,

		stagingRoot:
			string
	): Promise<
		readonly NostrPublicationResult[]
	> {

		const stagedEvents =
			await this
				.stagingRepository
				.list(
					stagingRoot
				);


		const publisher =
			await this
				.signer
				.getPublicKey();


		const reconciliationEntries =
			stagedEvents.map(
				entry => ({
					eventId:
						entry.eventId,

					createdAt:
						entry.createdAt
				})
			);


		const results:
			NostrPublicationResult[] =
				[];


		for (
			const relay
			of manifest.nostr.relays
		) {
			const missingEventIds =
				await this
					.reconciler
					.reconcile({
						relay,

						publisher,

						kind:
							manifest.kind,

						events:
							reconciliationEntries
					});


			if (
				missingEventIds.length >
					0
			) {
				throw new Error(
					'Nostr publication of missing staged events is not implemented yet.'
				);
			}


			for (
				const entry
				of stagedEvents
			) {
				results.push({
					eventId:
						entry.eventId,

					relay,

					status:
						'already-present'
				});
			}
		}


		return results;
	}
}