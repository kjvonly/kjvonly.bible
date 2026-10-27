import {
    createRxForwardReq,
    createRxOneshotReq,
    latest,
    timeline,
    uniq,
    type EventSigner,
    type OkPacketAgainstEvent,
    type RxNostr
} from 'rx-nostr';

import {
    lastValueFrom,
    map,
    toArray
} from 'rxjs';

import type {
    Event,
    EventParameters,
    Filter
} from 'nostr-typedef';

import {
    NostrClientError,
    type NostrClient,
    type NostrClientRequestOptions,
    type NostrPublishAcknowledgement,
    type NostrPublishResult,
    type NostrRelay,
    type NostrSubscription
} from '$lib/infrastructure/nostr/client/nostr-client';

/**
 * rx-nostr implementation of the Nostr client.
 *
 * Implements the application Nostr client boundary using one rx-nostr instance.
 */
export class RxNostrClient
    implements Pick<
        NostrClient,
        | 'setDefaultRelays'
        | 'getPublicKey'
        | 'getEvent'
        | 'getEvents'
        | 'publishEvent'
        | 'subscribe'
        | 'dispose'
    > {
    constructor(
        private readonly rxNostr: RxNostr,
        private readonly signer:
            Pick<
                EventSigner,
                'getPublicKey'
            >,
        private readonly onDispose:
            () => void = () => { }
    ) { }

    getPublicKey(): Promise<string> {
        return this.signer
            .getPublicKey();
    }

    /**
     * Retrieves the current event matching a bounded Nostr query.
     *
     * Each relay is limited to one result. When multiple relays return
     * different candidates, rx-nostr's latest() operator selects the
     * current event using Nostr event ordering.
     */
    async getEvent(
        filter: Filter,
        options?: NostrClientRequestOptions
    ): Promise<Event | null> {
        const request = createRxOneshotReq({
            filters: {
                ...filter,
                limit: 1
            }
        });

        const event$ = this.rxNostr
            .use(
                request,
                this.createReadOptions(options)
            )
            .pipe(
                uniq(),
                latest(),
                map(({ event }) => event)
            );

        const event = await lastValueFrom(event$, {
            defaultValue: null
        });

        if (event === null) {
            this.throwIfReadUnavailable(
                'getEvent',
                options
            );
        }

        return event;
    }

    /**
     * Retrieves all matching events from a bounded Nostr query.
     *
     * Identical signed events returned by multiple relays are
     * deduplicated by event id.
     *
     * The final result is ordered newest-first according to Nostr
     * event ordering.
     */
    async getEvents(
        filters: Filter | readonly Filter[],
        options?: NostrClientRequestOptions
    ): Promise<readonly Event[]> {
        const request = createRxOneshotReq({
            filters: normalizeFilters(filters)
        });

        const events$ = this.rxNostr
            .use(
                request,
                this.createReadOptions(options)
            )
            .pipe(
                uniq(),
                timeline(),
                map((packets) =>
                    packets.map(({ event }) => event)
                )
            );

        const events = await lastValueFrom(events$, {
            defaultValue: []
        });

        if (events.length === 0) {
            this.throwIfReadUnavailable(
                'getEvents',
                options
            );
        }

        return events;
    }

    private throwIfReadUnavailable(
        operation: 'getEvent' | 'getEvents',
        options?: NostrClientRequestOptions
    ): void {
        const relays = this.getReadRelays(options);

        if (relays.length === 0) {
            throw new NostrClientError(
                operation,
                relays,
                new Error(
                    'No readable Nostr relays are configured.'
                )
            );
        }

        const allUnavailable = relays.every((relay) => {
            const state =
                this.rxNostr.getRelayStatus(relay)?.connection;

            return (
                state === 'error' ||
                state === 'rejected' ||
                state === 'terminated'
            );
        });

        if (allUnavailable) {
            throw new NostrClientError(
                operation,
                relays
            );
        }
    }

    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: NostrClientRequestOptions
    ): NostrSubscription {
        const relays = this.getReadRelays(options);

        if (relays.length === 0) {
            throw new NostrClientError(
                'subscribe',
                relays,
                new Error(
                    'No readable Nostr relays are configured.'
                )
            );
        }

        const request = createRxForwardReq();

        try {
            const subscription = this.rxNostr
                .use(
                    request,
                    this.createReadOptions(options)
                )
                .subscribe(({ event }) => {
                    onEvent(event);
                });

            request.emit(
                normalizeFilters(filters)
            );

            let closed = false;

            return {
                close(): void {
                    if (closed) {
                        return;
                    }

                    closed = true;
                    subscription.unsubscribe();
                }
            };
        } catch (cause) {
            throw new NostrClientError(
                'subscribe',
                relays,
                cause
            );
        }
    }

    async publishEvent(
        event: EventParameters,
        options?: NostrClientRequestOptions
    ): Promise<NostrPublishResult> {
        const relays = this.getWriteRelays(options);

        if (relays.length === 0) {
            throw new NostrClientError(
                'publishEvent',
                relays,
                new Error(
                    'No writable Nostr relays are configured.'
                )
            );
        }

        try {
            const packets = await lastValueFrom(
                this.rxNostr
                    .send(
                        event,
                        this.createPublishOptions(options)
                    )
                    .pipe(toArray())
            );

            if (packets.length === 0) {
                throw new NostrClientError(
                    'publishEvent',
                    relays,
                    new Error(
                        'No relay acknowledgement was received.'
                    )
                );
            }

            const acknowledgements =
                normalizePublishAcknowledgements(
                    packets
                );

            return {
                eventId:
                    packets[packets.length - 1].eventId,

                acknowledgements,

                acceptedByAnyRelay:
                    acknowledgements.some(
                        ({ accepted }) => accepted
                    )
            };
        } catch (cause) {
            if (cause instanceof NostrClientError) {
                throw cause;
            }

            throw new NostrClientError(
                'publishEvent',
                relays,
                cause
            );
        }
    }
    private getReadRelays(
        options?: NostrClientRequestOptions
    ): string[] {
        if (options?.relays !== undefined) {
            return [...options.relays];
        }

        return Object.values(
            this.rxNostr.getDefaultRelays({
                filter: 'read-all'
            })
        ).map(({ url }) => url);
    }

    /**
     * Builds rx-nostr read options for this operation.
     *
     * When no relay override is supplied, rx-nostr uses the configured
     * default read relays.
     *
     * When relays are supplied, only those temporary relays are used
     * for this operation.
     */
    private createReadOptions(
        options?: NostrClientRequestOptions
    ) {
        if (options?.relays === undefined) {
            return undefined;
        }

        return {
            on: {
                relays: [...options.relays],
                defaultReadRelays: false
            }
        };
    }
    setDefaultRelays(
        relays: readonly NostrRelay[]
    ): void {
        this.rxNostr.setDefaultRelays(
            relays.map((relay) => ({
                url: relay.url,
                read: relay.read,
                write: relay.write
            }))
        );
    }

    private getWriteRelays(
        options?: NostrClientRequestOptions
    ): string[] {
        if (options?.relays !== undefined) {
            return [...options.relays];
        }

        return Object.values(
            this.rxNostr.getDefaultRelays({
                filter: 'write-all'
            })
        ).map(({ url }) => url);
    }

    private createPublishOptions(
        options?: NostrClientRequestOptions
    ) {
        const baseOptions = {
            completeOn: 'all-ok' as const,
            errorOnTimeout: false
        };

        if (options?.relays === undefined) {
            return baseOptions;
        }

        return {
            ...baseOptions,

            on: {
                relays: [...options.relays],
                defaultWriteRelays: false
            }
        };
    }

    dispose(): void {
        try {
            this.rxNostr.dispose();
        } finally {
            this.onDispose();
        }
    }
}
function normalizeFilters(
    filters: Filter | readonly Filter[]
): Filter[] {
    if (isFilterArray(filters)) {
        return [...filters];
    }

    return [filters];
}

function isFilterArray(
    filters: Filter | readonly Filter[]
): filters is readonly Filter[] {
    return Array.isArray(filters);
}

function normalizePublishAcknowledgements(
    packets: readonly OkPacketAgainstEvent[]
): NostrPublishAcknowledgement[] {
    const acknowledgements =
        new Map<
            string,
            NostrPublishAcknowledgement
        >();

    for (const packet of packets) {
        acknowledgements.set(
            packet.from,
            {
                relay: packet.from,
                accepted: packet.ok,
                message: packet.notice
            }
        );
    }

    return [
        ...acknowledgements.values()
    ];
}