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
	authenticateNostrToolsRelay
} from './authenticate-nostr-tools-relay.js';

import {
	connectNodeNostrToolsRelay
} from './connect-node-nostr-tools-relay.js';

import {
	createNostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';

import type {
	NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';


interface NostrToolsEventPublisherRelay {
	publish(
		event:
			SignedNostrEvent
	): Promise<string>;


	auth(
		signAuthEvent:
			NostrToolsAuthSigner
	): Promise<string>;


	close():
		void;
}


type NostrToolsEventPublisherConnector =
	(
		url:
			string
	) => Promise<
		NostrToolsEventPublisherRelay
	>;


export class NostrToolsEventPublisher
	implements NostrEventPublisher {

	constructor(
		private readonly signer:
			EventSigner,

		private readonly connectRelay:
			NostrToolsEventPublisherConnector =
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
			try {
				await relay.publish(
					event
				);
			}
			catch (
				error:
					unknown
			) {
				if (
					!this.isAuthRequired(
						error
					)
				) {
					throw error;
				}


				await authenticateNostrToolsRelay(
					relay,
					createNostrToolsAuthSigner(
						this.signer
					)
				);


				await relay.publish(
					event
				);
			}
		}
		finally {
			relay.close();
		}
	}


	private isAuthRequired(
		error:
			unknown
	): boolean {

		const message =
			error instanceof Error
				? error.message
				: String(
					error
				);


		return message.startsWith(
			'auth-required:'
		);
	}
}