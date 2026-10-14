import { setTimeout as sleep } from 'node:timers/promises';

import {
	SimplePool,
	useWebSocketImplementation
} from 'nostr-tools/pool';
import { SignedNostrEvent } from '#domain/event/nostr-event.js';
import { Logger } from '#ports/logging/logger.js';
import { EventSigner } from '#ports/nostr/event-signer.js';
import { NostrEventPublisher } from '#ports/nostr/nostr-event-publisher.js';
import { NostrToolsAuthSigner, createNostrToolsAuthSigner } from '../auth/nostr-tools-auth-signer.js';
import { NodeNostrWebSocket } from '../transport/node-nostr-websocket.js';


useWebSocketImplementation(NodeNostrWebSocket);


const MAX_TRANSPORT_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;


interface NostrToolsEventPublicationPool {
	publish(
		relays: string[],
		event: SignedNostrEvent,
		params: { readonly onauth: NostrToolsAuthSigner }
	): Promise<string>[];

	close(relays: string[]): void;
}


type NostrToolsEventPublicationPoolFactory =
	() => NostrToolsEventPublicationPool;


/**
 * Reuses the relay connection for a publication batch. Transient transport
 * errors invalidate that connection and retry the exact same signed event.
 * The caller must close the relay when the batch ends, including on failure.
 */
export class NostrToolsEventPublisher
	implements NostrEventPublisher {

	private readonly pools =
		new Map<string, NostrToolsEventPublicationPool>();

	constructor(
		private readonly signer: EventSigner,
		private readonly logger: Logger,
		private readonly createPool: NostrToolsEventPublicationPoolFactory =
			() => new SimplePool(),
		private readonly wait: (milliseconds: number) => Promise<void> =
			milliseconds => sleep(milliseconds)
	) {}


	async publish(
		relayUrl: string,
		event: SignedNostrEvent
	): Promise<void> {
		this.logger.verbose('nostr.event.transport.start', {
			relay: relayUrl,
			eventId: event.id
		});

		for (let attempt = 1; attempt <= MAX_TRANSPORT_ATTEMPTS; attempt++) {
			try {
				await Promise.all(
					this.poolFor(relayUrl).publish(
						[relayUrl],
						event,
						{
							onauth: createNostrToolsAuthSigner(this.signer)
						}
					)
				);

				this.logger.verbose('nostr.event.transport.complete', {
					relay: relayUrl,
					eventId: event.id
				});
				return;
			}
			catch (error: unknown) {
				if (!this.isTransientTransportError(error) ||
					attempt === MAX_TRANSPORT_ATTEMPTS) {
					this.logger.verbose('nostr.event.transport.failed', {
						relay: relayUrl,
						eventId: event.id,
						error: this.errorMessage(error),
						attempt,
						maxAttempts: MAX_TRANSPORT_ATTEMPTS
					});
					throw this.asError(error);
				}

				const delayMs = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
				this.logger.verbose('nostr.event.transport.retry', {
					relay: relayUrl,
					eventId: event.id,
					attempt: attempt + 1,
					delayMs,
					error: this.errorMessage(error)
				});

				// The connection may be unusable. Recreate its pool on retry.
				// A failed close must not suppress retry of the original timeout.
				try {
					this.close(relayUrl);
				}
				catch (closeError: unknown) {
					this.logger.verbose('nostr.event.transport.close.failed', {
						relay: relayUrl,
						eventId: event.id,
						error: this.errorMessage(closeError)
					});
				}
				await this.wait(delayMs);
			}
		}
	}


	/** Closes the connection retained for this relay's publication batch. */
	close(relayUrl: string): void {
		const pool = this.pools.get(relayUrl);
		if (!pool) return;
		this.pools.delete(relayUrl);
		pool.close([relayUrl]);
	}


	private poolFor(relayUrl: string): NostrToolsEventPublicationPool {
		let pool = this.pools.get(relayUrl);
		if (!pool) {
			pool = this.createPool();
			this.pools.set(relayUrl, pool);
		}
		return pool;
	}


	private isTransientTransportError(error: unknown): boolean {
		const message = this.errorMessage(error);
		// A relay policy rejection is definitive, even if its text mentions a timeout.
		if (/^(blocked|invalid|restricted|auth-required|duplicate):/i.test(message)) {
			return false;
		}
		return /connection failure|connect(?:ion)? timed? out|\btimeout\b|\btimed out\b|\beconnreset\b|\betimedout\b|\beconnrefused\b|socket hang up|websocket.*clos(?:e|ed)|connection closed|network error|unexpected server response: (?:408|429|500|502|503|504)\b/i.test(message);
	}


	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}


	private asError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}
}
