import type {
	SignedNostrEvent
} from '../../domain/nostr-event.js';

import type {
	NostrEventPublisher
} from '../../ports/nostr-event-publisher.js';

import {
	connectNodeNostrToolsRelay
} from './connect-node-nostr-tools-relay.js';

import type {
	NostrToolsRelayConnector
} from './nostr-tools-relay-reconciler.js';


export class NostrToolsEventPublisher
	implements NostrEventPublisher {

	constructor(
		private readonly connectRelay:
			NostrToolsRelayConnector =
				connectNodeNostrToolsRelay
	) {}


	async publish(
		relayUrl:
			string,

		event:
			SignedNostrEvent
	): Promise<void> {

		const relay =
			await this.connectRelay(
				relayUrl
			);


		try {
			await relay.publish(
				event
			);
		}
		finally {
			relay.close();
		}
	}
}