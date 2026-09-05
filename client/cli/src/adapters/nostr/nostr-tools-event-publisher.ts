import WebSocket from 'ws';

import {
	SimplePool,
	useWebSocketImplementation
} from 'nostr-tools/pool';

import type {
	SignedNostrEvent
} from '../../domain/nostr-event.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';

import type {
	NostrEventPublisher
} from '../../ports/nostr-event-publisher.js';

import {
	createNostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';

import type {
	NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';


useWebSocketImplementation(
	WebSocket
);


interface NostrToolsEventPublicationPool {

	publish(
		relays:
			string[],

		event:
			SignedNostrEvent,

		params: {
			readonly onauth:
				NostrToolsAuthSigner;
		}
	): Promise<string>[];


	close(
		relays:
			string[]
	): void;
}


type NostrToolsEventPublicationPoolFactory =
	() =>
		NostrToolsEventPublicationPool;


export class NostrToolsEventPublisher
	implements NostrEventPublisher {

	constructor(
		private readonly signer:
			EventSigner,

		private readonly createPool:
			NostrToolsEventPublicationPoolFactory =
				() =>
					new SimplePool()
	) {}


	async publish(
		relayUrl:
			string,

		event:
			SignedNostrEvent
	): Promise<void> {

		const pool =
			this.createPool();


		try {
			await Promise.all(
				pool.publish(
					[
						relayUrl
					],
					event,
					{
						onauth:
							createNostrToolsAuthSigner(
								this.signer
							)
					}
				)
			);
		}
		finally {
			pool.close([
				relayUrl
			]);
		}
	}
}