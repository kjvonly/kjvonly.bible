import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    from,
    map
} from 'rxjs';

import type {
    VerificationServiceClient
} from '@rx-nostr/crypto';

import type {
    EventSigner,
    OkPacketAgainstEvent,
    RxNostrConfig,
    RxNostr
} from 'rx-nostr';

import type {
    Event,
    EventParameters
} from 'nostr-typedef';

import {
    createNostrClient
} from './create-nostr-client';

function createVerificationClient():
    VerificationServiceClient {
    return {
        start:
            vi.fn(),

        verifier:
            vi.fn(
                async () => true
            ),

        get status() {
            return 'active' as const;
        },

        dispose:
            vi.fn(),

        [Symbol.dispose]:
            vi.fn()
    } as unknown as VerificationServiceClient;
}

function createSigner():
    EventSigner {
    return {
        getPublicKey:
            vi.fn(),

        signEvent:
            vi.fn()
    } as unknown as EventSigner;
}

function createRxNostr():
    RxNostr {
    return {
        dispose:
            vi.fn()
    } as unknown as RxNostr;
}


function createOkPacket(
    eventId: string
): OkPacketAgainstEvent {
    return {
        from:
            'wss://relay.test/',
        type:
            'OK',
        eventId,
        ok:
            true,
        notice:
            '',
        done:
            true,
        message: [
            'OK',
            eventId,
            true,
            ''
        ]
    };
}

describe(
    'createNostrClient',
    () => {
        it(
            'starts verification and configures rx-nostr',
            () => {
                const verificationClient =
                    createVerificationClient();

                const signer =
                    createSigner();

                const rxNostr =
                    createRxNostr();

                const rxNostrFactory =
                    vi.fn(
                        () => rxNostr
                    );

                createNostrClient(
                    verificationClient,
                    signer,
                    rxNostrFactory
                );

                expect(
                    verificationClient
                        .start
                ).toHaveBeenCalledOnce();

                expect(
                    rxNostrFactory
                ).toHaveBeenCalledWith({
                    verifier:
                        verificationClient
                            .verifier,

                    signer,

                    authenticator:
                        'auto',

                    connectionStrategy:
                        'lazy-keep',

                    eoseTimeout:
                        5_000,

                    okTimeout:
                        5_000,

                    authTimeout:
                        5_000,

                    retry: {
                        strategy:
                            'exponential',

                        maxCount:
                            5,

                        initialDelay:
                            1_000,

                        polite:
                            true
                    }
                });
            }
        );

        it(
            'does not wait for the verification worker before creating rx-nostr',
            () => {
                const verificationClient = {
                    ...createVerificationClient(),

                    get status() {
                        return 'booting' as const;
                    }
                } as VerificationServiceClient;

                const rxNostrFactory =
                    vi.fn(
                        () =>
                            createRxNostr()
                    );

                createNostrClient(
                    verificationClient,
                    createSigner(),
                    rxNostrFactory
                );

                expect(
                    rxNostrFactory
                ).toHaveBeenCalledOnce();
            }
        );

        it(
            'uses the supplied signer instance',
            () => {
                const verificationClient =
                    createVerificationClient();

                const signer =
                    createSigner();

                const rxNostr =
                    createRxNostr();

                const rxNostrFactory =
                    vi.fn(
                        (_config: RxNostrConfig) =>
                            rxNostr
                    );

                createNostrClient(
                    verificationClient,
                    signer,
                    rxNostrFactory
                );

                expect(
                    rxNostrFactory
                ).toHaveBeenCalledOnce();
               
                expect(
                    rxNostrFactory
                ).toHaveBeenCalledWith(
                    expect.objectContaining({
                        signer
                    })
                );
            }
        );



        it(
            'publishes through rx-nostr with one signer invocation',
            async () => {
                const verificationClient =
                    createVerificationClient();

                const signEvent =
                    vi.fn(
                        async (
                            event:
                                EventParameters
                        ): Promise<Event> => ({
                            ...event,
                            id:
                                'b'.repeat(64),
                            pubkey:
                                'a'.repeat(64),
                            created_at:
                                1,
                            sig:
                                'c'.repeat(128)
                        })
                    );

                const signer = {
                    getPublicKey:
                        vi.fn()
                            .mockResolvedValue(
                                'a'.repeat(64)
                            ),
                    signEvent
                } as unknown as EventSigner;

                const rxNostr = {
                    send:
                        vi.fn(
                            (
                                event:
                                    EventParameters
                            ) =>
                                from(
                                    signer.signEvent(
                                        event
                                    )
                                ).pipe(
                                    map(
                                        (signed) =>
                                            createOkPacket(
                                                signed.id
                                            )
                                    )
                                )
                        ),

                    getDefaultRelays:
                        vi.fn(() => ({
                            'wss://relay.test/': {
                                url:
                                    'wss://relay.test/',
                                read:
                                    true,
                                write:
                                    true
                            }
                        })),

                    dispose:
                        vi.fn()
                } as unknown as RxNostr;

                const client =
                    createNostrClient(
                        verificationClient,
                        signer,
                        () => rxNostr
                    );

                const event: EventParameters = {
                    kind:
                        37770,
                    tags: [],
                    content:
                        'content'
                };

                await client.publishEvent(
                    event
                );

                expect(
                    signEvent
                ).toHaveBeenCalledOnce();

                expect(
                    signEvent
                ).toHaveBeenCalledWith(
                    event
                );
            }
        );

        it(
            'disposes rx-nostr and the verification client together',
            () => {
                const verificationClient =
                    createVerificationClient();

                const rxNostr =
                    createRxNostr();

                const client =
                    createNostrClient(
                        verificationClient,
                        createSigner(),
                        () => rxNostr
                    );

                client.dispose();

                expect(
                    rxNostr.dispose
                ).toHaveBeenCalledOnce();

                expect(
                    verificationClient
                        .dispose
                ).toHaveBeenCalledOnce();
            }
        );
    }
);