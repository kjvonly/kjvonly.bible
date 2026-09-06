import { Manifest } from "../../../domain/manifest.js";
import { NostrPublicationResult } from "../../../domain/nostr-publication-result.js";
import { Logger } from "../../../ports/logging/logger.js";
import { EventSigner } from "../../../ports/nostr/event-signer.js";
import { NostrEventPublisher } from "../../../ports/nostr/nostr-event-publisher.js";
import { NostrRelayReconciler } from "../../../ports/nostr/nostr-relay-reconciler.js";
import { NostrEventStagingRepository } from "../../../ports/staging/nostr-event-staging-repository.js";




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
            await this
                .stagingRepository
                .list(
                    stagingRoot
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
