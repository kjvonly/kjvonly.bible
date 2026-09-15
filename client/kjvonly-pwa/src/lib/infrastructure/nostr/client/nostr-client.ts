import type { Event, EventParameters, Filter } from 'nostr-typedef';

/**
 * A Nostr relay available to the Nostr client.
 *
 * Read/write are intentionally explicit because a relay may be used
 * for only one direction.
 */
export interface NostrRelay {
    url: string;
    read: boolean;
    write: boolean;
}

/**
 * Options that apply to one Nostr client operation.
 */
export interface NostrClientRequestOptions {
    /**
     * Overrides the configured default relays for this operation.
     *
     * When omitted, the Nostr client uses its configured default
     * read or write relays.
     */
    relays?: readonly string[];
}

/**
 * The final acknowledgement received from one relay for a published event.
 */
export interface NostrPublishAcknowledgement {
    relay: string;
    accepted: boolean;
    message?: string;
}

/**
 * Result of publishing one signed Nostr event.
 *
 * This describes what the relay layer reported. How the result is interpreted is decided above the Nostr client.
 */
export interface NostrPublishResult {
    eventId: string;
    acknowledgements: readonly NostrPublishAcknowledgement[];
    acceptedByAnyRelay: boolean;
}

/**
 * Handle for a long-lived Nostr subscription.
 */
export interface NostrSubscription {
    /**
     * Stops the subscription.
     *
     * Implementations must make this operation idempotent.
     */
    close(): void;
}

export type NostrClientOperation =
    | 'setDefaultRelays'
    | 'getEvent'
    | 'getEvents'
    | 'subscribe'
    | 'publishEvent'
    | 'dispose';

/**
 * Indicates that a Nostr client operation could not be meaningfully
 * completed because usable Nostr relay communication was unavailable.
 *
 * A missing event is not an error:
 *
 * - getEvent() returns null
 * - getEvents() returns []
 *
 * NostrClientError is reserved for infrastructure failure.
 */
export class NostrClientError extends Error {
    constructor(
        public readonly operation: NostrClientOperation,
        public readonly relays: readonly string[],
        public readonly cause?: unknown
    ) {
        super(`Nostr client unavailable during ${operation}.`);

        this.name = 'NostrClientError';
    }
}

/**
 * Application Nostr communication boundary.
 *
 * NostrClient intentionally exposes Nostr Filter and Event types.
 * It isolates callers from the concrete Nostr client implementation
 * (rx-nostr), not from Nostr itself.
 */
export interface NostrClient {
    /**
     * Replaces the default relay configuration used by future operations.
     */
    setDefaultRelays(relays: readonly NostrRelay[]): void;

    /**
     * Returns the public key for the signer configured on this client.
     */
    getPublicKey(): Promise<string>;

    /**
     * Executes a bounded historical query where one matching event is expected.
     *
     * Returns:
     *
     * - Event when a matching event exists.
     * - null when the request completed normally without a match.
     *
     * Throws NostrClientError when the relay operation could not be
     * meaningfully completed.
     */
    getEvent(
        filter: Filter,
        options?: NostrClientRequestOptions
    ): Promise<Event | null>;

    /**
     * Executes a bounded historical query where multiple events may match.
     *
     * Implementations must:
     *
     * - deduplicate identical signed events by event id;
     * - return results in deterministic Nostr ordering.
     *
     * Returns [] when the request completed normally without any matches.
     *
     * Throws NostrClientError when the relay operation could not be
     * meaningfully completed.
     */
    getEvents(
        filters: Filter | readonly Filter[],
        options?: NostrClientRequestOptions
    ): Promise<readonly Event[]>;

    /**
     * Publishes Nostr event parameters.
     *
     * The signer configured on the underlying Nostr client signs the event
     * as part of publication. Callers construct event semantics but do not
     * sign the event themselves.
     *
     * Relay rejection (OK=false) is represented in NostrPublishResult and
     * is not itself a NostrClientError.
     */
    publishEvent(
        event: EventParameters,
        options?: NostrClientRequestOptions
    ): Promise<NostrPublishResult>;

    /**
     * Starts a long-lived subscription for matching Nostr events.
     *
     * Unlike getEvent() and getEvents(), this does not automatically complete
     * after historical relay results have been returned.
     *
     * The caller owns the returned subscription and must close it when it is
     * no longer needed.
     */
    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: NostrClientRequestOptions
    ): NostrSubscription;

    /**
     * Permanently releases resources owned by this client.
     *
     * The client must not be used after dispose() has been called.
     */
    dispose(): void;
}