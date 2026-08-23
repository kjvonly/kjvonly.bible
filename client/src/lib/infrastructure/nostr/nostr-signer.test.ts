import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    finalizeEvent,
    generateSecretKey,
    getPublicKey,
    nip19,
    verifyEvent
} from 'nostr-tools';

import type {
    BunkerSigner
} from 'nostr-tools/nip46';

import type {
    Nip07
} from 'nostr-typedef';

const nip46Mocks =
    vi.hoisted(() => ({
        parseBunkerInput:
            vi.fn(),

        fromBunker:
            vi.fn()
    }));

vi.mock(
    'nostr-tools/nip46',
    () => ({
        parseBunkerInput:
            nip46Mocks
                .parseBunkerInput,

        BunkerSigner: {
            fromBunker:
                nip46Mocks
                    .fromBunker
        }
    })
);

import {
    NostrSigner
} from './nostr-signer';

describe(
    'NostrSigner',
    () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        describe(
            'unconfigured',
            () => {
                it(
                    'throws when a public key is requested before configuration',
                    async () => {
                        const signer =
                            new NostrSigner();

                        await expect(
                            signer
                                .getPublicKey()
                        ).rejects.toThrow(
                            'Nostr signer is not configured.'
                        );
                    }
                );

                it(
                    'throws when signing is requested before configuration',
                    async () => {
                        const signer =
                            new NostrSigner();

                        await expect(
                            signer.signEvent({
                                kind:
                                    37770,

                                content:
                                    '{}',

                                tags:
                                    [],

                                created_at:
                                    100
                            })
                        ).rejects.toThrow(
                            'Nostr signer is not configured.'
                        );
                    }
                );
            }
        );

        describe(
            'local secret key',
            () => {
                it(
                    'returns the public key for the configured secret key',
                    async () => {
                        const secretKey =
                            generateSecretKey();

                        const signer =
                            new NostrSigner();

                        await signer
                            .useSecretKey(
                                secretKey
                            );

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(
                            getPublicKey(
                                secretKey
                            )
                        );
                    }
                );

                it(
                    'creates a cryptographically valid signed event',
                    async () => {
                        const secretKey =
                            generateSecretKey();

                        const signer =
                            new NostrSigner();

                        await signer
                            .useSecretKey(
                                secretKey
                            );

                        const event =
                            await signer
                                .signEvent({
                                    kind:
                                        37770,

                                    content:
                                        '{"chapter":3}',

                                    tags: [
                                        [
                                            'd',
                                            'test/chapter'
                                        ]
                                    ],

                                    created_at:
                                        100
                                });

                        expect(
                            event.pubkey
                        ).toBe(
                            getPublicKey(
                                secretKey
                            )
                        );

                        expect(
                            verifyEvent(
                                event
                            )
                        ).toBe(true);

                        expect(
                            event.kind
                        ).toBe(37770);

                        expect(
                            event.created_at
                        ).toBe(100);
                    }
                );

                it(
                    'accepts an nsec',
                    async () => {
                        const secretKey =
                            generateSecretKey();

                        const nsec =
                            nip19.nsecEncode(
                                secretKey
                            );

                        const signer =
                            new NostrSigner();

                        await signer
                            .useNsec(nsec);

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(
                            getPublicKey(
                                secretKey
                            )
                        );
                    }
                );

                it(
                    'rejects a non-nsec NIP-19 value',
                    async () => {
                        const npub =
                            nip19.npubEncode(
                                getPublicKey(
                                    generateSecretKey()
                                )
                            );

                        const signer =
                            new NostrSigner();

                        await expect(
                            signer
                                .useNsec(
                                    npub
                                )
                        ).rejects.toThrow(
                            'Expected a Nostr nsec.'
                        );
                    }
                );

                it(
                    'rejects an invalid secret key length',
                    async () => {
                        const signer =
                            new NostrSigner();

                        await expect(
                            signer
                                .useSecretKey(
                                    new Uint8Array(
                                        31
                                    )
                                )
                        ).rejects.toThrow(
                            'Nostr secret key must be 32 bytes.'
                        );
                    }
                );

                it(
                    'uses the configured clock when created_at is missing',
                    async () => {
                        const signer =
                            new NostrSigner(
                                () => 123
                            );

                        await signer
                            .useSecretKey(
                                generateSecretKey()
                            );

                        const event =
                            await signer
                                .signEvent({
                                    kind:
                                        37770,

                                    content:
                                        '{}'
                                });

                        expect(
                            event.created_at
                        ).toBe(123);

                        expect(
                            event.tags
                        ).toEqual([]);
                    }
                );
            }
        );

        describe(
            'NIP-07',
            () => {
                it(
                    'delegates getPublicKey to the supplied NIP-07 signer',
                    async () => {
                        const pubkey =
                            'a'.repeat(64);

                        const nip07 = {
                            getPublicKey:
                                vi.fn(
                                    async () =>
                                        pubkey
                                ),

                            signEvent:
                                vi.fn()
                        } as unknown as Nip07.Nostr;

                        const signer =
                            new NostrSigner();

                        await signer
                            .useNip07(
                                nip07
                            );

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(pubkey);

                        expect(
                            nip07
                                .getPublicKey
                        ).toHaveBeenCalledOnce();
                    }
                );

                it(
                    'delegates signing to the supplied NIP-07 signer',
                    async () => {
                        const secretKey =
                            generateSecretKey();

                        const signedEvent =
                            finalizeEvent(
                                {
                                    kind:
                                        37770,

                                    content:
                                        '{}',

                                    tags:
                                        [],

                                    created_at:
                                        100
                                },
                                secretKey
                            );

                        const nip07 = {
                            getPublicKey:
                                vi.fn(),

                            signEvent:
                                vi.fn(
                                    async () =>
                                        signedEvent
                                )
                        } as unknown as Nip07.Nostr;

                        const signer =
                            new NostrSigner(
                                () => 100
                            );

                        await signer
                            .useNip07(
                                nip07
                            );

                        const result =
                            await signer
                                .signEvent({
                                    kind:
                                        37770,

                                    content:
                                        '{}'
                                });

                        expect(
                            nip07.signEvent
                        ).toHaveBeenCalledWith({
                            kind:
                                37770,

                            content:
                                '{}',

                            tags:
                                [],

                            created_at:
                                100
                        });

                        expect(
                            result
                        ).toBe(
                            signedEvent
                        );
                    }
                );

                it(
                    'does not access window or localStorage itself',
                    async () => {
                        const nip07 = {
                            getPublicKey:
                                vi.fn(
                                    async () =>
                                        'a'.repeat(
                                            64
                                        )
                                ),

                            signEvent:
                                vi.fn()
                        } as unknown as Nip07.Nostr;

                        const signer =
                            new NostrSigner();

                        await signer
                            .useNip07(
                                nip07
                            );

                        await signer
                            .getPublicKey();

                        expect(
                            nip07
                                .getPublicKey
                        ).toHaveBeenCalledOnce();
                    }
                );
            }
        );

        describe(
            'NIP-46',
            () => {
                it(
                    'connects using application-provided state and delegates signing',
                    async () => {
                        const clientSecretKey =
                            generateSecretKey();

                        const pubkey =
                            'a'.repeat(64);

                        const signedEvent =
                            finalizeEvent(
                                {
                                    kind:
                                        37770,

                                    content:
                                        '{}',

                                    tags:
                                        [],

                                    created_at:
                                        100
                                },
                                generateSecretKey()
                            );

                        const connect =
                            vi.fn();

                        const getPublicKey =
                            vi.fn(
                                async () =>
                                    pubkey
                            );

                        const signEvent =
                            vi.fn(
                                async () =>
                                    signedEvent
                            );

                        const close =
                            vi.fn(async () => {})

                        const bunkerSigner = {
                            connect,
                            getPublicKey,
                            signEvent,
                            close
                        } as unknown as BunkerSigner;

                        const bunkerPointer = {
                            pubkey:
                                'b'.repeat(
                                    64
                                ),

                            relays: [
                                'wss://relay.test'
                            ]
                        };

                        nip46Mocks
                            .parseBunkerInput
                            .mockResolvedValue(
                                bunkerPointer
                            );

                        nip46Mocks
                            .fromBunker
                            .mockReturnValue(
                                bunkerSigner
                            );

                        const onAuth =
                            vi.fn();

                        const signer =
                            new NostrSigner();

                        const resultPubkey =
                            await signer
                                .connectNip46(
                                    'bunker://test',
                                    clientSecretKey,
                                    onAuth
                                );

                        expect(
                            nip46Mocks
                                .parseBunkerInput
                        ).toHaveBeenCalledWith(
                            'bunker://test'
                        );

                        expect(
                            nip46Mocks
                                .fromBunker
                        ).toHaveBeenCalledWith(
                            clientSecretKey,
                            bunkerPointer,
                            {
                                onauth:
                                    onAuth
                            }
                        );

                        expect(
                            connect
                        ).toHaveBeenCalledOnce();

                        expect(
                            getPublicKey
                        ).toHaveBeenCalledOnce();

                        expect(
                            resultPubkey
                        ).toBe(pubkey);

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(pubkey);

                        const result =
                            await signer
                                .signEvent({
                                    kind:
                                        37770,

                                    content:
                                        '{}',

                                    tags:
                                        [],

                                    created_at:
                                        100
                                });

                        expect(
                            signEvent
                        ).toHaveBeenCalledWith({
                            kind:
                                37770,

                            content:
                                '{}',

                            tags:
                                [],

                            created_at:
                                100
                        });

                        expect(
                            result
                        ).toBe(
                            signedEvent
                        );
                    }
                );

                it(
                    'rejects an invalid bunker URL',
                    async () => {
                        nip46Mocks
                            .parseBunkerInput
                            .mockResolvedValue(
                                null
                            );

                        const signer =
                            new NostrSigner();

                        await expect(
                            signer
                                .connectNip46(
                                    'not-a-bunker',
                                    generateSecretKey()
                                )
                        ).rejects.toThrow(
                            'Invalid NIP-46 bunker URL.'
                        );

                        expect(
                            nip46Mocks
                                .fromBunker
                        ).not.toHaveBeenCalled();
                    }
                );

                it(
                    'closes a failed bunker connection',
                    async () => {
                        const failure =
                            new Error(
                                'connection failed'
                            );

                        const close =
                            vi.fn(
                                async () => { }
                            );

                        const bunkerSigner = {
                            connect:
                                vi.fn(
                                    async () => {
                                        throw failure;
                                    }
                                ),

                            getPublicKey:
                                vi.fn(),

                            signEvent:
                                vi.fn(),

                            close
                        } as unknown as BunkerSigner;

                        nip46Mocks
                            .parseBunkerInput
                            .mockResolvedValue({
                                pubkey:
                                    'a'.repeat(
                                        64
                                    ),

                                relays: [
                                    'wss://relay.test'
                                ]
                            });

                        nip46Mocks
                            .fromBunker
                            .mockReturnValue(
                                bunkerSigner
                            );

                        const signer =
                            new NostrSigner();

                        await expect(
                            signer
                                .connectNip46(
                                    'bunker://test',
                                    generateSecretKey()
                                )
                        ).rejects.toBe(
                            failure
                        );

                        expect(
                            close
                        ).toHaveBeenCalledOnce();
                    }
                );

                it(
                    'closes the bunker when signer state is cleared',
                    async () => {
                        const close =
                            vi.fn(async () => {})

                        const bunkerSigner = {
                            connect:
                                vi.fn(),

                            getPublicKey:
                                vi.fn(
                                    async () =>
                                        'a'.repeat(
                                            64
                                        )
                                ),

                            signEvent:
                                vi.fn(),

                            close
                        } as unknown as BunkerSigner;

                        nip46Mocks
                            .parseBunkerInput
                            .mockResolvedValue({
                                pubkey:
                                    'b'.repeat(
                                        64
                                    ),

                                relays: [
                                    'wss://relay.test'
                                ]
                            });

                        nip46Mocks
                            .fromBunker
                            .mockReturnValue(
                                bunkerSigner
                            );

                        const signer =
                            new NostrSigner();

                        await signer
                            .connectNip46(
                                'bunker://test',
                                generateSecretKey()
                            );

                        await signer.clear();

                        expect(
                            close
                        ).toHaveBeenCalledOnce();

                        await expect(
                            signer
                                .getPublicKey()
                        ).rejects.toThrow(
                            'Nostr signer is not configured.'
                        );
                    }
                );
            }
        );

        describe(
            'signer switching',
            () => {
                it(
                    'uses the newly configured signer without replacing the NostrSigner object',
                    async () => {
                        const signer =
                            new NostrSigner();

                        const secretKey =
                            generateSecretKey();

                        await signer
                            .useSecretKey(
                                secretKey
                            );

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(
                            getPublicKey(
                                secretKey
                            )
                        );

                        const nip07Pubkey =
                            'b'.repeat(64);

                        const nip07 = {
                            getPublicKey:
                                vi.fn(
                                    async () =>
                                        nip07Pubkey
                                ),

                            signEvent:
                                vi.fn()
                        } as unknown as Nip07.Nostr;

                        await signer
                            .useNip07(
                                nip07
                            );

                        expect(
                            await signer
                                .getPublicKey()
                        ).toBe(
                            nip07Pubkey
                        );
                    }
                );
            }
        );
    }
);