import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    Manifest
} from '#domain/manifest.js';

import type {
    EventSigner
} from '#ports/event-signer.js';

import type {
    Logger
} from '#ports/logger.js';

import type {
    NostrEventStagingRepository
} from '#ports/nostr-event-staging-repository.js';

import type {
    NostrRelayReconciler
} from '#ports/nostr-relay-reconciler.js';

import {
    NostrStagedEventPublisher
} from './nostr-staged-event-publisher.js';

import type {
    NostrEventPublisher
} from '#ports/nostr-event-publisher.js';


function createLogger():
    Logger {

    return {
        verbose:
            vi.fn()
    };
}


function createManifest() {

    return {
        version:
            1,

        kind:
            37770,

        staging: {
            path:
                './.kjvonly'
        },

        nostr: {
            relays: [
                'wss://relay-a.example',
                'wss://relay-b.example'
            ]
        },

        strategies:
            {},

        resources:
            {},

        collections:
            {}
    } satisfies Manifest;
}


describe(
    'NostrStagedEventPublisher',
    () => {

        it(
            'returns already-present results without reading staged events',
            async () => {
                const publishEvent =
                    vi.fn();


                const eventPublisher:
                    NostrEventPublisher = {
                    publish:
                        publishEvent
                };

                const publisher =
                    'a'.repeat(
                        64
                    );


                const stagedEvents = [
                    {
                        path:
                            '/staging/events/chapters/1.json',

                        eventId:
                            'b'.repeat(
                                64
                            ),

                        createdAt:
                            1000
                    },
                    {
                        path:
                            '/staging/events/chapters/2.json',

                        eventId:
                            'c'.repeat(
                                64
                            ),

                        createdAt:
                            1001
                    }
                ];


                const read =
                    vi.fn();


                const stagingRepository:
                    NostrEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot,
                                category
                            ) =>
                                category ===
                                    'resource'
                                    ? stagedEvents
                                    : []
                        ),

                    read
                };


                const signer:
                    EventSigner = {
                    getPublicKey:
                        vi.fn(
                            async () =>
                                publisher
                        ),

                    sign:
                        vi.fn()
                };


                const reconcile =
                    vi.fn(
                        async () =>
                            []
                    );


                const reconciler:
                    NostrRelayReconciler = {
                    reconcile
                };


                const logger =
                    createLogger();


                const nostrPublisher =
                    new NostrStagedEventPublisher(
                        stagingRepository,
                        signer,
                        reconciler,
                        eventPublisher,
                        logger
                    );


                const results =
                    await nostrPublisher.publish(
                        createManifest(),
                        '/staging'
                    );


                expect(
                    stagingRepository.list
                ).toHaveBeenCalledTimes(
                    3
                );


                expect(
                    stagingRepository.list
                ).toHaveBeenNthCalledWith(
                    1,
                    '/staging',
                    'resource'
                );


                expect(
                    stagingRepository.list
                ).toHaveBeenNthCalledWith(
                    2,
                    '/staging',
                    'collection'
                );


                expect(
                    stagingRepository.list
                ).toHaveBeenNthCalledWith(
                    3,
                    '/staging',
                    'filesystem'
                );


                expect(
                    reconcile
                ).toHaveBeenCalledTimes(
                    2
                );


                expect(
                    reconcile
                ).toHaveBeenNthCalledWith(
                    1,
                    {
                        relay:
                            'wss://relay-a.example',

                        publisher,

                        kind:
                            37770,

                        events: [
                            {
                                eventId:
                                    stagedEvents[0]!
                                        .eventId,

                                createdAt:
                                    1000
                            },
                            {
                                eventId:
                                    stagedEvents[1]!
                                        .eventId,

                                createdAt:
                                    1001
                            }
                        ]
                    }
                );


                expect(
                    read
                ).not.toHaveBeenCalled();


                expect(
                    results
                ).toEqual([
                    {
                        eventId:
                            stagedEvents[0]!
                                .eventId,

                        relay:
                            'wss://relay-a.example',

                        status:
                            'already-present'
                    },
                    {
                        eventId:
                            stagedEvents[1]!
                                .eventId,

                        relay:
                            'wss://relay-a.example',

                        status:
                            'already-present'
                    },
                    {
                        eventId:
                            stagedEvents[0]!
                                .eventId,

                        relay:
                            'wss://relay-b.example',

                        status:
                            'already-present'
                    },
                    {
                        eventId:
                            stagedEvents[1]!
                                .eventId,

                        relay:
                            'wss://relay-b.example',

                        status:
                            'already-present'
                    }
                ]);

                expect(
                    publishEvent
                ).not.toHaveBeenCalled();


                expect(
                    logger.verbose
                ).toHaveBeenCalledWith(
                    'nostr.publish.start',
                    {
                        stagingRoot:
                            '/staging',

                        relayCount:
                            2
                    }
                );


                expect(
                    logger.verbose
                ).toHaveBeenCalledWith(
                    'nostr.event.already-present',
                    {
                        relay:
                            'wss://relay-a.example',

                        eventId:
                            stagedEvents[0]!
                                .eventId
                    }
                );


                expect(
                    logger.verbose
                ).toHaveBeenCalledWith(
                    'nostr.publish.complete',
                    {
                        resultCount:
                            4
                    }
                );
            }


        );

        it(
            'reads and publishes only a missing staged event',
            async () => {

                const eventId =
                    'b'.repeat(
                        64
                    );


                const stagedEntry = {
                    path:
                        '/staging/events/chapters/1.json',

                    eventId,

                    createdAt:
                        1000
                };


                const event = {
                    id:
                        eventId,

                    pubkey:
                        'a'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const read =
                    vi.fn(
                        async () =>
                            event
                    );


                const stagingRepository:
                    NostrEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot,
                                category
                            ) =>
                                category ===
                                    'resource'
                                    ? [
                                        stagedEntry
                                    ]
                                    : []
                        ),

                    read
                };


                const signer:
                    EventSigner = {
                    getPublicKey:
                        vi.fn(
                            async () =>
                                event.pubkey
                        ),

                    sign:
                        vi.fn()
                };


                const reconciler:
                    NostrRelayReconciler = {
                    reconcile:
                        vi.fn(
                            async () => [
                                eventId
                            ]
                        )
                };


                const publishEvent =
                    vi.fn();


                const eventPublisher:
                    NostrEventPublisher = {
                    publish:
                        publishEvent
                };


                const publisher =
                    new NostrStagedEventPublisher(
                        stagingRepository,
                        signer,
                        reconciler,
                        eventPublisher,
                        createLogger()
                    );


                const results =
                    await publisher.publish(
                        {
                            ...createManifest(),

                            nostr: {
                                relays: [
                                    'wss://relay.example'
                                ]
                            }
                        },
                        '/staging'
                    );


                expect(
                    read
                ).toHaveBeenCalledOnce();


                expect(
                    read
                ).toHaveBeenCalledWith(
                    stagedEntry
                );


                expect(
                    publishEvent
                ).toHaveBeenCalledOnce();


                expect(
                    publishEvent
                ).toHaveBeenCalledWith(
                    'wss://relay.example',
                    event
                );


                expect(
                    results
                ).toEqual([
                    {
                        eventId,

                        relay:
                            'wss://relay.example',

                        status:
                            'published'
                    }
                ]);
            }
        );
        it(
            'publishes missing events in Resource, Collection, and Filesystem category order',
            async () => {
                const relay =
                    'wss://relay.example';

                const publisher =
                    'a'.repeat(64);

                const stagedEntries = {
                    resource: {
                        path: '/staging/events/chapters/1.json',
                        eventId: 'b'.repeat(64),
                        createdAt: 1000
                    },
                    collection: {
                        path: '/staging/events/__collections__/defaults.json',
                        eventId: 'c'.repeat(64),
                        createdAt: 1001
                    },
                    filesystem: {
                        path: '/staging/events/__filesystems__/library.json',
                        eventId: 'd'.repeat(64),
                        createdAt: 1002
                    }
                } as const;

                const read =
                    vi.fn(
                        async (
                            entry:
                                Parameters<
                                    NostrEventStagingRepository['read']
                                >[0]
                        ) => ({
                            id: entry.eventId,
                            pubkey: publisher,
                            created_at: entry.createdAt,
                            kind: 37770,
                            tags: [],
                            content: entry.eventId,
                            sig: 'e'.repeat(128)
                        })
                    );

                const stagingRepository:
                    NostrEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot,
                                category
                            ) => [
                                stagedEntries[category]
                            ]
                        ),
                    read
                };

                const publishEvent =
                    vi.fn();

                const nostrPublisher =
                    new NostrStagedEventPublisher(
                        stagingRepository,
                        {
                            getPublicKey:
                                vi.fn(
                                    async () => publisher
                                ),
                            sign:
                                vi.fn()
                        },
                        {
                            reconcile:
                                vi.fn(
                                    async () => [
                                        stagedEntries.filesystem.eventId,
                                        stagedEntries.collection.eventId,
                                        stagedEntries.resource.eventId
                                    ]
                                )
                        },
                        {
                            publish:
                                publishEvent
                        },
                        createLogger()
                    );

                await nostrPublisher.publish(
                    {
                        ...createManifest(),
                        nostr: {
                            relays: [
                                relay
                            ]
                        }
                    },
                    '/staging'
                );

                expect(
                    publishEvent.mock.calls.map(
                        call =>
                            call[1].id
                    )
                ).toEqual([
                    stagedEntries.resource.eventId,
                    stagedEntries.collection.eventId,
                    stagedEntries.filesystem.eventId
                ]);
            }
        );


        it(
            'reconciles and publishes independently per relay',
            async () => {

                const eventId =
                    'b'.repeat(
                        64
                    );


                const stagedEntry = {
                    path:
                        '/staging/events/chapters/1.json',

                    eventId,

                    createdAt:
                        1000
                };


                const event = {
                    id:
                        eventId,

                    pubkey:
                        'a'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const read =
                    vi.fn(
                        async () =>
                            event
                    );


                const stagingRepository:
                    NostrEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot,
                                category
                            ) =>
                                category ===
                                    'resource'
                                    ? [
                                        stagedEntry
                                    ]
                                    : []
                        ),

                    read
                };


                const signer:
                    EventSigner = {
                    getPublicKey:
                        vi.fn(
                            async () =>
                                event.pubkey
                        ),

                    sign:
                        vi.fn()
                };


                const reconcile =
                    vi.fn()
                        .mockResolvedValueOnce(
                            []
                        )
                        .mockResolvedValueOnce([
                            eventId
                        ]);


                const reconciler:
                    NostrRelayReconciler = {
                    reconcile
                };


                const publishEvent =
                    vi.fn();


                const eventPublisher:
                    NostrEventPublisher = {
                    publish:
                        publishEvent
                };


                const publisher =
                    new NostrStagedEventPublisher(
                        stagingRepository,
                        signer,
                        reconciler,
                        eventPublisher,
                        createLogger()
                    );


                const results =
                    await publisher.publish(
                        createManifest(),
                        '/staging'
                    );


                expect(
                    reconcile
                ).toHaveBeenCalledTimes(
                    2
                );


                expect(
                    read
                ).toHaveBeenCalledOnce();


                expect(
                    read
                ).toHaveBeenCalledWith(
                    stagedEntry
                );


                expect(
                    publishEvent
                ).toHaveBeenCalledOnce();


                expect(
                    publishEvent
                ).toHaveBeenCalledWith(
                    'wss://relay-b.example',
                    event
                );


                expect(
                    results
                ).toEqual([
                    {
                        eventId,

                        relay:
                            'wss://relay-a.example',

                        status:
                            'already-present'
                    },
                    {
                        eventId,

                        relay:
                            'wss://relay-b.example',

                        status:
                            'published'
                    }
                ]);
            }
        );

        it(
            'rejects an unknown event ID returned by reconciliation',
            async () => {

                const stagedEntry = {
                    path:
                        '/staging/events/chapters/1.json',

                    eventId:
                        'b'.repeat(
                            64
                        ),

                    createdAt:
                        1000
                };


                const unknownEventId =
                    'c'.repeat(
                        64
                    );


                const read =
                    vi.fn();


                const stagingRepository:
                    NostrEventStagingRepository = {
                    list:
                        vi.fn(
                            async (
                                _stagingRoot,
                                category
                            ) =>
                                category ===
                                    'resource'
                                    ? [
                                        stagedEntry
                                    ]
                                    : []
                        ),

                    read
                };


                const signer:
                    EventSigner = {
                    getPublicKey:
                        vi.fn(
                            async () =>
                                'a'.repeat(
                                    64
                                )
                        ),

                    sign:
                        vi.fn()
                };


                const reconciler:
                    NostrRelayReconciler = {
                    reconcile:
                        vi.fn(
                            async () => [
                                unknownEventId
                            ]
                        )
                };


                const publishEvent =
                    vi.fn();


                const eventPublisher:
                    NostrEventPublisher = {
                    publish:
                        publishEvent
                };


                const publisher =
                    new NostrStagedEventPublisher(
                        stagingRepository,
                        signer,
                        reconciler,
                        eventPublisher,
                        createLogger()
                    );


                await expect(
                    publisher.publish(
                        {
                            ...createManifest(),

                            nostr: {
                                relays: [
                                    'wss://relay.example'
                                ]
                            }
                        },
                        '/staging'
                    )
                ).rejects.toThrow(
                    `Nostr reconciliation returned unknown staged event ID: ${unknownEventId}`
                );


                expect(
                    read
                ).not.toHaveBeenCalled();


                expect(
                    publishEvent
                ).not.toHaveBeenCalled();
            }
        );
    }
);