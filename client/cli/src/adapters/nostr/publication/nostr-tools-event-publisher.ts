import WebSocket from 'ws';

import {
	SimplePool,
	useWebSocketImplementation
} from 'nostr-tools/pool';
import { SignedNostrEvent } from '../../../domain/event/nostr-event.js';
import { Logger } from '../../../ports/logging/logger.js';
import { EventSigner } from '../../../ports/nostr/event-signer.js';
import { NostrEventPublisher } from '../../../ports/nostr/nostr-event-publisher.js';
import { NostrToolsAuthSigner, createNostrToolsAuthSigner } from '../auth/nostr-tools-auth-signer.js';




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

		private readonly logger:
			Logger,

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

		this.logTransportStart(
			relayUrl,
			event.id
		);


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


			this.logTransportComplete(
				relayUrl,
				event.id
			);
		}
		catch (
			error:
				unknown
		) {
			this.logTransportFailed(
				relayUrl,
				event.id,
				error
			);


			throw error;
		}
		finally {
			pool.close([
				relayUrl
			]);
		}
	}


	private logTransportStart(
		relay:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'nostr.event.transport.start',
			{
				relay,
				eventId
			}
		);
	}


	private logTransportComplete(
		relay:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'nostr.event.transport.complete',
			{
				relay,
				eventId
			}
		);
	}


	private logTransportFailed(
		relay:
			string,

		eventId:
			string,

		error:
			unknown
	): void {

		this.logger.verbose(
			'nostr.event.transport.failed',
			{
				relay,
				eventId,

				error:
					error instanceof Error
						? error.message
						: String(
							error
						)
			}
		);
	}
}
