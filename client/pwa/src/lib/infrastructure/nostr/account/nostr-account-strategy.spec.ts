import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    Event
} from 'nostr-typedef';

import {
    NostrAccountStrategy
} from './nostr-account-strategy';

///////////////////////////////////////////////////////////////////////////////

function signedEvent(
    parameters: {
        kind: number;
        content: string;
        tags?: string[][];
        createdAt?: number;
    }
): Event {
    return {
        id:
            `event-${parameters.kind}-${parameters.createdAt ?? 1}`,
        pubkey:
            'user-id',
        created_at:
            parameters.createdAt ?? 1,
        kind:
            parameters.kind,
        tags:
            parameters.tags ?? [],
        content:
            parameters.content,
        sig:
            'signature'
    } as Event;
}

function createClient(
    overrides: Record<string, unknown> = {}
) {
    return {
        getPublicKey:
            vi.fn()
                .mockResolvedValue(
                    'user-id'
                ),
        getEvent:
            vi.fn()
                .mockResolvedValue(
                    null
                ),
        getEvents:
            vi.fn()
                .mockResolvedValue(
                    []
                ),
        ...overrides
    };
}

function createEvents(
    overrides: Record<string, unknown> = {}
) {
    return {
        getByKindAndPubkey:
            vi.fn()
                .mockResolvedValue(
                    undefined
                ),
        cache:
            vi.fn()
                .mockResolvedValue(
                    undefined
                ),
        put:
            vi.fn()
                .mockResolvedValue(
                    undefined
                ),
        ...overrides
    };
}

function createStrategy(
    client = createClient(),
    events = createEvents()
) {
    return new NostrAccountStrategy(
        client,
        events,
        [
            {
                url:
                    'wss://account.example',
                read:
                    true,
                write:
                    true
            }
        ],
        'application-pubkey'
    );
}

///////////////////////////////////////////////////////////////////////////////

describe(
    'NostrAccountStrategy',
    () => {
        it(
            'loads account state from cached metadata and relay preferences',
            async () => {
                const getByKindAndPubkey =
                    vi.fn(
                        async (kind: number) => {
                            if (kind === 0) {
                                return {
                                    key:
                                        'nostr/event:0:user-id',
                                    pubkey:
                                        'user-id',
                                    kind: 0,
                                    content:
                                        '{"name":"Cached Name"}',
                                    tags: []
                                };
                            }

                            if (
                                kind ===
                                10002
                            ) {
                                return {
                                    key:
                                        'nostr/event:10002:user-id',
                                    pubkey:
                                        'user-id',
                                    kind: 10002,
                                    content: '',
                                    tags: [
                                        [
                                            'r',
                                            'wss://read-write.example'
                                        ],
                                        [
                                            'r',
                                            'wss://read.example',
                                            'read'
                                        ],
                                        [
                                            'r',
                                            'wss://write.example',
                                            'write'
                                        ]
                                    ]
                                };
                            }

                            return undefined;
                        }
                    );

                const strategy =
                    createStrategy(
                        createClient(),
                        createEvents({
                            getByKindAndPubkey
                        })
                    );

                await expect(
                    strategy.load(
                        'user-id'
                    )
                ).resolves.toEqual({
                    name:
                        'Cached Name',
                    relays: [
                        {
                            url:
                                'wss://read-write.example',
                            read: true,
                            write: true
                        },
                        {
                            url:
                                'wss://read.example',
                            read: true,
                            write: false
                        },
                        {
                            url:
                                'wss://write.example',
                            read: false,
                            write: true
                        }
                    ]
                });

                expect(
                    getByKindAndPubkey
                ).toHaveBeenCalledTimes(
                    3
                );

                expect(
                    getByKindAndPubkey
                ).toHaveBeenNthCalledWith(
                    1,
                    0,
                    'user-id'
                );

                expect(
                    getByKindAndPubkey
                ).toHaveBeenNthCalledWith(
                    2,
                    3,
                    'user-id'
                );

                expect(
                    getByKindAndPubkey
                ).toHaveBeenNthCalledWith(
                    3,
                    10002,
                    'user-id'
                );
            }
        );

        it(
            'refreshes current account events and caches the signed relay events',
            async () => {
                const metadata =
                    signedEvent({
                        kind: 0,
                        content:
                            '{"name":"Fresh Name"}',
                        createdAt: 3
                    });

                const olderMetadata =
                    signedEvent({
                        kind: 0,
                        content:
                            '{"name":"Old Name"}',
                        createdAt: 1
                    });

                const contacts =
                    signedEvent({
                        kind: 3,
                        content: '',
                        createdAt: 2
                    });

                const relays =
                    signedEvent({
                        kind: 10002,
                        content: '',
                        createdAt: 2,
                        tags: [
                            [
                                'r',
                                'wss://account.example'
                            ]
                        ]
                    });

                const getEvents =
                    vi.fn()
                        .mockResolvedValue([
                            metadata,
                            contacts,
                            relays,
                            olderMetadata
                        ]);

                const cache =
                    vi.fn()
                        .mockResolvedValue(
                            undefined
                        );

                const getByKindAndPubkey =
                    vi.fn(
                        async (kind: number) => {
                            switch (kind) {
                                case 0:
                                    return metadata;
                                case 3:
                                    return contacts;
                                case 10002:
                                    return relays;
                                default:
                                    return undefined;
                            }
                        }
                    );

                const strategy =
                    createStrategy(
                        createClient({
                            getEvents
                        }),
                        createEvents({
                            cache,
                            getByKindAndPubkey
                        })
                    );

                await expect(
                    strategy.refresh(
                        'user-id'
                    )
                ).resolves.toEqual({
                    name:
                        'Fresh Name',
                    relays: [
                        {
                            url:
                                'wss://account.example',
                            read: true,
                            write: true
                        }
                    ]
                });

                expect(getEvents)
                    .toHaveBeenCalledWith(
                        {
                            kinds:
                                [0, 3, 10002],
                            authors:
                                ['user-id']
                        },
                        {
                            relays:
                                ['wss://account.example']
                        }
                    );

                expect(cache)
                    .toHaveBeenCalledTimes(3);

                expect(cache)
                    .toHaveBeenNthCalledWith(
                        1,
                        metadata
                    );

                expect(cache)
                    .toHaveBeenNthCalledWith(
                        2,
                        contacts
                    );

                expect(cache)
                    .toHaveBeenNthCalledWith(
                        3,
                        relays
                    );
            }
        );

        it(
            'preserves cached account state when a relay refresh is partial',
            async () => {
                const freshMetadata =
                    signedEvent({
                        kind: 0,
                        content:
                            '{"name":"Fresh Name"}',
                        createdAt: 3
                    });

                const cachedRelays = {
                    key:
                        'nostr/event:10002:user-id',
                    pubkey:
                        'user-id',
                    kind: 10002,
                    content: '',
                    tags: [
                        [
                            'r',
                            'wss://cached.example'
                        ]
                    ]
                };

                const getByKindAndPubkey =
                    vi.fn(
                        async (kind: number) => {
                            if (kind === 0) {
                                return freshMetadata;
                            }

                            if (kind === 10002) {
                                return cachedRelays;
                            }

                            return undefined;
                        }
                    );

                const strategy =
                    createStrategy(
                        createClient({
                            getEvents:
                                vi.fn()
                                    .mockResolvedValue([
                                        freshMetadata
                                    ])
                        }),
                        createEvents({
                            getByKindAndPubkey
                        })
                    );

                await expect(
                    strategy.refresh(
                        'user-id'
                    )
                ).resolves.toEqual({
                    name:
                        'Fresh Name',
                    relays: [
                        {
                            url:
                                'wss://cached.example',
                            read: true,
                            write: true
                        }
                    ]
                });
            }
        );

        it(
            'ignores invalid cached metadata content',
            async () => {
                const strategy =
                    createStrategy(
                        createClient(),
                        createEvents({
                            getByKindAndPubkey:
                                vi.fn(
                                    async (kind: number) =>
                                        kind === 0
                                            ? {
                                                key:
                                                    'nostr/event:0:user-id',
                                                pubkey:
                                                    'user-id',
                                                kind: 0,
                                                content:
                                                    'not-json',
                                                tags: []
                                            }
                                            : undefined
                                )
                        })
                    );

                await expect(
                    strategy.load(
                        'user-id'
                    )
                ).resolves.toEqual({});
            }
        );

        it(
            'treats an empty cached kind 10002 event as an explicit empty relay list',
            async () => {
                const strategy =
                    createStrategy(
                        createClient(),
                        createEvents({
                            getByKindAndPubkey:
                                vi.fn(
                                    async (kind: number) => {
                                        if (kind === 10002) {
                                            return {
                                                key:
                                                    'nostr/event:10002:user-id',
                                                pubkey:
                                                    'user-id',
                                                kind: 10002,
                                                content: '',
                                                tags: []
                                            };
                                        }

                                        if (kind === 3) {
                                            return {
                                                key:
                                                    'nostr/event:3:user-id',
                                                pubkey:
                                                    'user-id',
                                                kind: 3,
                                                content:
                                                    JSON.stringify({
                                                        'wss://legacy.example': {
                                                            read: true,
                                                            write: true
                                                        }
                                                    }),
                                                tags: []
                                            };
                                        }

                                        return undefined;
                                    }
                                )
                        })
                    );

                await expect(
                    strategy.load(
                        'user-id'
                    )
                ).resolves.toEqual({
                    relays: []
                });
            }
        );

        it(
            'falls back to the cached kind 3 relay map when no kind 10002 relay list exists',
            async () => {
                const strategy =
                    createStrategy(
                        createClient(),
                        createEvents({
                            getByKindAndPubkey:
                                vi.fn(
                                    async (kind: number) =>
                                        kind === 3
                                            ? {
                                                key:
                                                    'nostr/event:3:user-id',
                                                pubkey:
                                                    'user-id',
                                                kind: 3,
                                                content:
                                                    JSON.stringify({
                                                        'wss://read.example': {
                                                            read: true,
                                                            write: false
                                                        },
                                                        'wss://write.example': {
                                                            read: false,
                                                            write: true
                                                        }
                                                    }),
                                                tags: []
                                            }
                                            : undefined
                                )
                        })
                    );

                await expect(
                    strategy.load(
                        'user-id'
                    )
                ).resolves.toEqual({
                    relays: [
                        {
                            url:
                                'wss://read.example',
                            read: true,
                            write: false
                        },
                        {
                            url:
                                'wss://write.example',
                            read: false,
                            write: true
                        }
                    ]
                });
            }
        );

        it(
            'writes account Nostr events through NostrEventsService',
            async () => {
                const getPublicKey =
                    vi.fn()
                        .mockResolvedValue(
                            'user-id'
                        );

                const getEvent =
                    vi.fn()
                        .mockResolvedValue(
                            null
                        );

                const put =
                    vi.fn()
                        .mockResolvedValue(
                            undefined
                        );

                const strategy =
                    createStrategy(
                        createClient({
                            getPublicKey,
                            getEvent
                        }),
                        createEvents({
                            put
                        })
                    );

                await strategy.setup({
                    userId:
                        'user-id',
                    name:
                        'Stephen'
                });

                expect(getPublicKey)
                    .toHaveBeenCalledTimes(1);

                expect(getEvent)
                    .toHaveBeenCalledWith(
                        {
                            kinds: [3],
                            authors:
                                ['user-id']
                        },
                        {
                            relays:
                                ['wss://account.example']
                        }
                    );

                expect(put)
                    .toHaveBeenCalledTimes(3);

                expect(put)
                    .toHaveBeenNthCalledWith(
                        1,
                        {
                            key:
                                'nostr/event:0:user-id',
                            pubkey:
                                'user-id',
                            kind: 0,
                            content:
                                JSON.stringify({
                                    name:
                                        'Stephen',
                                    display_name:
                                        'Stephen'
                                }),
                            tags: []
                        }
                    );

                expect(put)
                    .toHaveBeenNthCalledWith(
                        2,
                        {
                            key:
                                'nostr/event:10002:user-id',
                            pubkey:
                                'user-id',
                            kind:
                                10002,
                            content:
                                '',
                            tags: [
                                [
                                    'r',
                                    'wss://account.example'
                                ]
                            ]
                        }
                    );

                expect(put)
                    .toHaveBeenNthCalledWith(
                        3,
                        {
                            key:
                                'nostr/event:3:user-id',
                            pubkey:
                                'user-id',
                            kind: 3,
                            content: '',
                            tags: [
                                [
                                    'p',
                                    'application-pubkey'
                                ]
                            ]
                        }
                    );
            }
        );

        it(
            'updates profile metadata and relay preferences without rewriting contacts',
            async () => {
                const getByKindAndPubkey =
                    vi.fn(
                        async (kind: number) =>
                            kind === 0
                                ? {
                                    key:
                                        'nostr/event:0:user-id',
                                    pubkey:
                                        'user-id',
                                    kind: 0,
                                    content:
                                        JSON.stringify({
                                            name:
                                                'Old Name',
                                            display_name:
                                                'Old Name',
                                            about:
                                                'Existing about',
                                            picture:
                                                'https://example.test/picture.png'
                                        }),
                                    tags: []
                                }
                                : undefined
                    );

                const put =
                    vi.fn()
                        .mockResolvedValue(
                            undefined
                        );

                const getEvent =
                    vi.fn();

                const strategy =
                    createStrategy(
                        createClient({
                            getEvent
                        }),
                        createEvents({
                            getByKindAndPubkey,
                            put
                        })
                    );

                await strategy.update({
                    userId:
                        'user-id',
                    name:
                        'Updated Name',
                    relays: [
                        {
                            url:
                                'wss://read.example',
                            read: true,
                            write: false
                        },
                        {
                            url:
                                'wss://write.example',
                            read: false,
                            write: true
                        },
                        {
                            url:
                                'wss://both.example',
                            read: true,
                            write: true
                        }
                    ]
                });

                expect(getEvent)
                    .not.toHaveBeenCalled();

                expect(put)
                    .toHaveBeenCalledTimes(2);

                expect(put)
                    .toHaveBeenNthCalledWith(
                        1,
                        {
                            key:
                                'nostr/event:0:user-id',
                            pubkey:
                                'user-id',
                            kind: 0,
                            content:
                                JSON.stringify({
                                    name:
                                        'Updated Name',
                                    display_name:
                                        'Updated Name',
                                    about:
                                        'Existing about',
                                    picture:
                                        'https://example.test/picture.png'
                                }),
                            tags: []
                        }
                    );

                expect(put)
                    .toHaveBeenNthCalledWith(
                        2,
                        {
                            key:
                                'nostr/event:10002:user-id',
                            pubkey:
                                'user-id',
                            kind:
                                10002,
                            content:
                                '',
                            tags: [
                                [
                                    'r',
                                    'wss://read.example',
                                    'read'
                                ],
                                [
                                    'r',
                                    'wss://write.example',
                                    'write'
                                ],
                                [
                                    'r',
                                    'wss://both.example'
                                ]
                            ]
                        }
                    );
            }
        );

        it(
            'rejects invalid relay preferences before writing an account update',
            async () => {
                const put =
                    vi.fn();

                const strategy =
                    createStrategy(
                        createClient(),
                        createEvents({
                            put
                        })
                    );

                await expect(
                    strategy.update({
                        userId:
                            'user-id',
                        name:
                            'Stephen',
                        relays: [
                            {
                                url:
                                    'https://not-a-nostr-relay.example',
                                read: true,
                                write: true
                            }
                        ]
                    })
                ).rejects.toThrow(
                    'Invalid account relay'
                );

                expect(put)
                    .not.toHaveBeenCalled();
            }
        );

        it(
            'preserves existing contacts when writing the application follow',
            async () => {
                const existing =
                    signedEvent({
                        kind: 3,
                        content:
                            'existing content',
                        tags: [
                            [
                                'p',
                                'existing-pubkey'
                            ]
                        ]
                    });

                const put =
                    vi.fn()
                        .mockResolvedValue(
                            undefined
                        );

                const strategy =
                    createStrategy(
                        createClient({
                            getEvent:
                                vi.fn()
                                    .mockResolvedValue(
                                        existing
                                    )
                        }),
                        createEvents({
                            put
                        })
                    );

                await strategy.setup({
                    userId:
                        'user-id',
                    name:
                        'Stephen'
                });

                expect(put)
                    .toHaveBeenNthCalledWith(
                        3,
                        {
                            key:
                                'nostr/event:3:user-id',
                            pubkey:
                                'user-id',
                            kind: 3,
                            content:
                                'existing content',
                            tags: [
                                [
                                    'p',
                                    'existing-pubkey'
                                ],
                                [
                                    'p',
                                    'application-pubkey'
                                ]
                            ]
                        }
                    );
            }
        );

        it(
            'rejects account setup when the active Nostr identity differs',
            async () => {
                const getEvent =
                    vi.fn();

                const put =
                    vi.fn();

                const strategy =
                    createStrategy(
                        createClient({
                            getPublicKey:
                                vi.fn()
                                    .mockResolvedValue(
                                        'different-user'
                                    ),
                            getEvent
                        }),
                        createEvents({
                            put
                        })
                    );

                await expect(
                    strategy.setup({
                        userId:
                            'user-id',
                        name:
                            'Stephen'
                    })
                ).rejects.toThrow(
                    'Authenticated user does not match the active Nostr identity.'
                );

                expect(getEvent)
                    .not.toHaveBeenCalled();

                expect(put)
                    .not.toHaveBeenCalled();
            }
        );
    }
);
