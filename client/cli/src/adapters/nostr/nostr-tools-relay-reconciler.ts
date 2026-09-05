import {
	createNostrToolsNegentropyStorage
} from './nostr-tools-negentropy-storage.js';

import {
	reconcileNostrToolsNegentropy
} from './nostr-tools-negentropy-session.js';

import type {
	NegentropyRelay
} from './nostr-tools-negentropy-session.js';

import type {
	NostrRelayReconciler,
	NostrRelayReconciliationRequest
} from '../../ports/nostr-relay-reconciler.js';

import type {
	SignedNostrEvent
} from '../../domain/nostr-event.js';

export interface NostrToolsRelayConnection
	extends NegentropyRelay {

	publish(
		event:
			SignedNostrEvent
	): Promise<string>;


	close():
		void;
}

export type NostrToolsRelayConnector =
	(
		url:
			string
	) => Promise<
		NostrToolsRelayConnection
	>;


export class NostrToolsRelayReconciler
	implements NostrRelayReconciler {

	constructor(
		private readonly connectRelay:
			NostrToolsRelayConnector
	) {}


	async reconcile(
		request:
			NostrRelayReconciliationRequest
	): Promise<
		readonly string[]
	> {

		const relay =
			await this.connectRelay(
				request.relay
			);


		try {
			const storage =
				createNostrToolsNegentropyStorage(
					request.events
				);


			return await reconcileNostrToolsNegentropy(
				relay,
				storage,
				{
					authors: [
						request.publisher
					],

					kinds: [
						request.kind
					]
				}
			);
		}
		finally {
			relay.close();
		}
	}
}