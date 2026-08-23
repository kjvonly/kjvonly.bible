import {
    createRxForwardReq,
    createRxOneshotReq,
    latest,
    timeline,
    uniq,
    type RxNostr
} from 'rx-nostr';

import {
    lastValueFrom,
    map
} from 'rxjs';

import type {
    Event,
    Filter
} from 'nostr-typedef';

import {
    ResourceClientError,
    type ResourceClient,
    type ResourceClientRequestOptions,
    type ResourceRelay,
    type ResourceSubscription
} from '$lib/resource/nostr/resource-client';

/**
 * rx-nostr implementation of the Resource Client.
 *
 * During the phased implementation this class implements only the
 * bounded-read portion of ResourceClient. Additional operations are
 * added in later phases.
 */
export class RxNostrResourceClient
    implements Pick<
        ResourceClient,
        | 'setDefaultRelays'
        | 'getEvent'
        | 'getEvents'
        | 'subscribe'
        | 'dispose'
    > {
    constructor(
        private readonly rxNostr: RxNostr
    ) { }

    /**
     * Retrieves the current event matching a bounded Nostr query.
     *
     * Each relay is limited to one result. When multiple relays return
     * different candidates, rx-nostr's latest() operator selects the
     * current event using Nostr event ordering.
     */
    async getEvent(
        filter: Filter,
        options?: ResourceClientRequestOptions
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
        options?: ResourceClientRequestOptions
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
        options?: ResourceClientRequestOptions
    ): void {
        const relays = this.getReadRelays(options);

        if (relays.length === 0) {
            throw new ResourceClientError(
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
            throw new ResourceClientError(
                operation,
                relays
            );
        }
    }

    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: ResourceClientRequestOptions
    ): ResourceSubscription {
        const relays = this.getReadRelays(options);

        if (relays.length === 0) {
            throw new ResourceClientError(
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
            throw new ResourceClientError(
                'subscribe',
                relays,
                cause
            );
        }
    }

    private getReadRelays(
        options?: ResourceClientRequestOptions
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
        options?: ResourceClientRequestOptions
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
        relays: readonly ResourceRelay[]
    ): void {
        this.rxNostr.setDefaultRelays(
            relays.map((relay) => ({
                url: relay.url,
                read: relay.read,
                write: relay.write
            }))
        );
    }

    dispose(): void {
        this.rxNostr.dispose();
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
