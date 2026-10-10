
import { Manifest } from "#domain/manifest/manifest.js";
import { NostrPublicationResult } from "#domain/publication/nostr-publication-result.js";
import { Logger } from "#ports/logging/logger.js";
import { EventSigner } from "#ports/nostr/event-signer.js";
import { NostrEventPublisher } from "#ports/nostr/nostr-event-publisher.js";
import { NostrRelayReconciler } from "#ports/nostr/nostr-relay-reconciler.js";
import { NostrEventStagingRepository, StagedNostrEventCategory, StagedNostrEventEntry } from "#ports/staging/nostr-event-staging-repository.js";


const NOSTR_PUBLICATION_CATEGORY_ORDER:
    readonly StagedNostrEventCategory[] = [
        'resource',
        'collection',
        'filesystem'
    ];


/**
 * Reconciles and publishes staged Nostr events using application-owned category order.
 *
 * The order Resource → Collection → Filesystem is a category policy only; this
 * publisher does not topologically sort dependencies within an individual category.
 * Only logical names in the supplied Manifest are queried from local staging;
 * stale events copied from a previous generation are not intentionally published.
 * Reconciliation checks whether staged event IDs are present on each relay;
 * it does not rebuild, re-sign, or delete old replaceable events.
 */
export class NostrStagedEventPublisher {

    constructor(
        private readonly stagingRepository:
            NostrEventStagingRepository,

        private readonly signer:
            EventSigner,

        private readonly reconciler:
            NostrRelayReconciler,

        private readonly eventPublisher:
            NostrEventPublisher,

        private readonly logger:
            Logger
    ) { }


    /**
     * Reconciles staged event IDs per relay and publishes only missing events.
     *
     * @param manifest Publication policy including kind and configured relays.
     * @param stagingRoot Root of the desired local staging state.
     */
    async publish(
        manifest:
            Manifest,

        stagingRoot:
            string
    ): Promise<
        readonly NostrPublicationResult[]
    > {

        this.logPublishStart(
            stagingRoot,
            manifest.nostr.relays.length
        );


        const stagedEvents =
            await this.listStagedEventsInPublicationOrder(
                stagingRoot,
                manifest
            );


        this.logStagedEventsLoaded(
            stagedEvents.length
        );


        const publisher =
            await this
                .signer
                .getPublicKey();


        const reconciliationEntries =
            stagedEvents.map(
                entry => ({
                    eventId:
                        entry.eventId,

                    createdAt:
                        entry.createdAt
                })
            );


        const stagedEventIds =
            new Set(
                stagedEvents.map(
                    entry =>
                        entry.eventId
                )
            );


        const results:
            NostrPublicationResult[] =
                [];


        for (
            const relay
            of manifest.nostr.relays
        ) {
            this.logRelayStart(
                relay,
                stagedEvents.length
            );


            const missingEventIds =
                await this
                    .reconciler
                    .reconcile({
                        relay,

                        publisher,

                        kind:
                            manifest.kind,

                        events:
                            reconciliationEntries
                    });


            const missing =
                new Set(
                    missingEventIds
                );


            for (
                const eventId
                of missing
            ) {
                if (
                    !stagedEventIds.has(
                        eventId
                    )
                ) {
                    throw new Error(
                        `Nostr reconciliation returned unknown staged event ID: ${eventId}`
                    );
                }
            }


            this.logRelayReconciled(
                relay,
                missing.size,
                stagedEvents.length -
                    missing.size
            );


            let publishedCount =
                0;


            let alreadyPresentCount =
                0;


            for (
                const entry
                of stagedEvents
            ) {
                if (
                    missing.has(
                        entry.eventId
                    )
                ) {
                    this.logEventRead(
                        relay,
                        entry.eventId
                    );


                    const event =
                        await this
                            .stagingRepository
                            .read(
                                entry
                            );


                    this.logEventPublishStart(
                        relay,
                        entry.eventId
                    );


                    await this
                        .eventPublisher
                        .publish(
                            relay,
                            event
                        );


                    this.logEventPublishComplete(
                        relay,
                        entry.eventId
                    );


                    publishedCount +=
                        1;


                    results.push({
                        eventId:
                            entry.eventId,

                        relay,

                        status:
                            'published'
                    });


                    continue;
                }


                this.logEventAlreadyPresent(
                    relay,
                    entry.eventId
                );


                alreadyPresentCount +=
                    1;


                results.push({
                    eventId:
                        entry.eventId,

                    relay,

                    status:
                        'already-present'
                });
            }


            this.logRelayComplete(
                relay,
                publishedCount,
                alreadyPresentCount
            );
        }


        this.logPublishComplete(
            results.length
        );


        return results;
    }


    /**
     * Lists only entries belonging to the current Manifest in category order.
     * Obsolete staged names remain on disk for inspection but are not published.
     * This establishes only category ordering. It does not topologically sort
     * dependencies among events within the same category.
     */
    private async listStagedEventsInPublicationOrder(
        stagingRoot:
            string,
        manifest:
            Manifest
    ): Promise<
        readonly StagedNostrEventEntry[]
    > {

        const stagedEvents:
            StagedNostrEventEntry[] =
                [];


        const logicalNamesByCategory: Record<StagedNostrEventCategory, readonly string[]> = {
            resource: Object.keys(manifest.resources),
            collection: Object.keys(manifest.collections),
            filesystem: Object.keys(manifest.filesystems)
        };

        for (
            const category
            of NOSTR_PUBLICATION_CATEGORY_ORDER
        ) {
            stagedEvents.push(
                ...await this
                    .stagingRepository
                    .list(
                        stagingRoot,
                        category,
                        logicalNamesByCategory[category]
                    )
            );
        }


        return stagedEvents;
    }


    private logPublishStart(
        stagingRoot:
            string,

        relayCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.publish.start',
            {
                stagingRoot,
                relayCount
            }
        );
    }


    private logStagedEventsLoaded(
        eventCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.staged.loaded',
            {
                eventCount
            }
        );
    }


    private logRelayStart(
        relay:
            string,

        eventCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.relay.start',
            {
                relay,
                eventCount
            }
        );
    }


    private logRelayReconciled(
        relay:
            string,

        missingCount:
            number,

        presentCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.relay.reconciled',
            {
                relay,
                missingCount,
                presentCount
            }
        );
    }


    private logEventAlreadyPresent(
        relay:
            string,

        eventId:
            string
    ): void {

        this.logger.verbose(
            'nostr.event.already-present',
            {
                relay,
                eventId
            }
        );
    }


    private logEventRead(
        relay:
            string,

        eventId:
            string
    ): void {

        this.logger.verbose(
            'nostr.event.read',
            {
                relay,
                eventId
            }
        );
    }


    private logEventPublishStart(
        relay:
            string,

        eventId:
            string
    ): void {

        this.logger.verbose(
            'nostr.event.publish.start',
            {
                relay,
                eventId
            }
        );
    }


    private logEventPublishComplete(
        relay:
            string,

        eventId:
            string
    ): void {

        this.logger.verbose(
            'nostr.event.publish.complete',
            {
                relay,
                eventId
            }
        );
    }


    private logRelayComplete(
        relay:
            string,

        publishedCount:
            number,

        alreadyPresentCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.relay.complete',
            {
                relay,
                publishedCount,
                alreadyPresentCount
            }
        );
    }


    private logPublishComplete(
        resultCount:
            number
    ): void {

        this.logger.verbose(
            'nostr.publish.complete',
            {
                resultCount
            }
        );
    }
}
