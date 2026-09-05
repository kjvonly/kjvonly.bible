import type {
    Manifest
} from '../domain/manifest.js';

import type {
    NostrPublicationResult
} from '../domain/nostr-publication-result.js';

import type {
    EventSigner
} from '../ports/event-signer.js';

import type {
    NostrEventPublisher
} from '../ports/nostr-event-publisher.js';

import type {
    NostrEventStagingRepository
} from '../ports/nostr-event-staging-repository.js';

import type {
    NostrRelayReconciler
} from '../ports/nostr-relay-reconciler.js';


export class NostrStagedEventPublisher {

    constructor(
        private readonly stagingRepository:
            NostrEventStagingRepository,

        private readonly signer:
            EventSigner,

        private readonly reconciler:
            NostrRelayReconciler,

        private readonly eventPublisher:
            NostrEventPublisher
    ) { }


    async publish(
        manifest:
            Manifest,

        stagingRoot:
            string
    ): Promise<
        readonly NostrPublicationResult[]
    > {

        const stagedEvents =
            await this
                .stagingRepository
                .list(
                    stagingRoot
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
            
            for (
                const entry
                of stagedEvents
            ) {
                if (
                    missing.has(
                        entry.eventId
                    )
                ) {
                    const event =
                        await this
                            .stagingRepository
                            .read(
                                entry
                            );


                    await this
                        .eventPublisher
                        .publish(
                            relay,
                            event
                        );


                    results.push({
                        eventId:
                            entry.eventId,

                        relay,

                        status:
                            'published'
                    });


                    continue;
                }


                results.push({
                    eventId:
                        entry.eventId,

                    relay,

                    status:
                        'already-present'
                });
            }
        }


        return results;
    }
}
