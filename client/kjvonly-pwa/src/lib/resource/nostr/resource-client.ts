import type { Event, EventParameters, Filter } from 'nostr-typedef';

/**
 * A Nostr relay available to the Resource Client.
 *
 * Read/write are intentionally explicit because a relay may be used
 * for only one direction.
 */
export interface ResourceRelay {
    url: string;
    read: boolean;
    write: boolean;
}

/**
 * Options that apply to one Resource Client operation.
 */
export interface ResourceClientRequestOptions {
    /**
     * Overrides the configured default relays for this operation.
     *
     * When omitted, the Resource Client uses its configured default
     * read or write relays.
     */
    relays?: readonly string[];
}

/**
 * The final acknowledgement received from one relay for a published event.
 */
export interface ResourcePublishAcknowledgement {
    relay: string;
    accepted: boolean;
    message?: string;
}

/**
 * Result of publishing one signed Nostr event.
 *
 * This describes what the relay layer reported. Whether the result
 * satisfies the Resource Publication lifecycle is decided above the
 * Resource Client.
 */
export interface ResourcePublishResult {
    eventId: string;
    acknowledgements: readonly ResourcePublishAcknowledgement[];
    acceptedByAnyRelay: boolean;
}

/**
 * Handle for a long-lived Nostr subscription.
 */
export interface ResourceSubscription {
    /**
     * Stops the subscription.
     *
     * Implementations must make this operation idempotent.
     */
    close(): void;
}

export type ResourceClientOperation =
    | 'setDefaultRelays'
    | 'getEvent'
    | 'getEvents'
    | 'subscribe'
    | 'publishEvent'
    | 'dispose';

/**
 * Indicates that a Resource Client operation could not be meaningfully
 * completed because usable Nostr relay communication was unavailable.
 *
 * A missing event is not an error:
 *
 * - getEvent() returns null
 * - getEvents() returns []
 *
 * ResourceClientError is reserved for infrastructure failure.
 */
export class ResourceClientError extends Error {
    constructor(
        public readonly operation: ResourceClientOperation,
        public readonly relays: readonly string[],
        public readonly cause?: unknown
    ) {
        super(`Resource client unavailable during ${operation}.`);

        this.name = 'ResourceClientError';
    }
}

/**
 * Nostr communication boundary used by the Resource lifecycle.
 *
 * ResourceClient intentionally exposes Nostr Filter and Event types.
 * It isolates the Resource Boundary from the concrete Nostr client
 * implementation (rx-nostr), not from Nostr itself.
 */
export interface ResourceClient {
    /**
     * Replaces the default relay configuration used by future operations.
     */
    setDefaultRelays(relays: readonly ResourceRelay[]): void;

    /**
     * Executes a bounded historical query where one matching event is expected.
     *
     * Returns:
     *
     * - Event when a matching event exists.
     * - null when the request completed normally without a match.
     *
     * Throws ResourceClientError when the relay operation could not be
     * meaningfully completed.
     */
    getEvent(
        filter: Filter,
        options?: ResourceClientRequestOptions
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
     * Throws ResourceClientError when the relay operation could not be
     * meaningfully completed.
     */
    getEvents(
        filters: Filter | readonly Filter[],
        options?: ResourceClientRequestOptions
    ): Promise<readonly Event[]>;

    /**
     * Publishes an already-signed Nostr event.
     *
     * Event construction, Resource identity, and signing happen after this
     * boundary.
     *
     * Relay rejection (OK=false) is represented in ResourcePublishResult and
     * is not itself a ResourceClientError.
     */
    publishEvent(
        event: EventParameters,
        options?: ResourceClientRequestOptions
    ): Promise<ResourcePublishResult>;

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
        options?: ResourceClientRequestOptions
    ): ResourceSubscription;

    /**
     * Permanently releases resources owned by this client.
     *
     * The client must not be used after dispose() has been called.
     */
    dispose(): void;
}