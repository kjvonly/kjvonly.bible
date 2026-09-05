import type {
    EventSigner
} from '../../ports/event-signer.js';

import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    NostrToolsEventPublisher
} from './nostr-tools-event-publisher.js';


describe(
    'NostrToolsEventPublisher',
    () => {

        const signer:
            EventSigner = {
            getPublicKey:
                vi.fn(),

            sign:
                vi.fn()
        };

        it(
            'publishes the exact signed event and closes the relay',
            async () => {

                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
                            64
                        ),

                    created_at:
                        1000,

                    kind:
                        37770,

                    tags:
                        [
                            [
                                'd',
                                'kjvonly/test/1_1'
                            ]
                        ],

                    content:
                        'content',

                    sig:
                        'c'.repeat(
                            128
                        )
                };


                const publish =
                    vi.fn(
                        async () =>
                            'published'
                    );


                const close =
                    vi.fn();


                const relay = {
                    prepareSubscription:
                        vi.fn(),

                    send:
                        vi.fn(),

                    publish,

                    auth:
                        vi.fn(),

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const publisher =
                    new NostrToolsEventPublisher(
                        signer,
                        connectRelay
                    );


                await publisher.publish(
                    'wss://relay.example',
                    event
                );


                expect(
                    connectRelay
                ).toHaveBeenCalledWith(
                    'wss://relay.example'
                );


                expect(
                    publish
                ).toHaveBeenCalledOnce();


                expect(
                    publish
                ).toHaveBeenCalledWith(
                    event
                );


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );

        it(
            'closes the relay when publication is rejected',
            async () => {

                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
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


                const publish =
                    vi.fn(
                        async () => {

                            throw new Error(
                                'blocked: event rejected'
                            );
                        }
                    );


                const close =
                    vi.fn();


                const relay = {
                    prepareSubscription:
                        vi.fn(),

                    send:
                        vi.fn(),

                    publish,

                    auth:
                        vi.fn(),

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const publisher =
                    new NostrToolsEventPublisher(
                        signer,
                        connectRelay
                    );


                await expect(
                    publisher.publish(
                        'wss://relay.example',
                        event
                    )
                ).rejects.toThrow(
                    'blocked: event rejected'
                );


                expect(
                    publish
                ).toHaveBeenCalledWith(
                    event
                );


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );
        it(
            'authenticates and retries the exact event once when authentication is required',
            async () => {

                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
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


                const publish =
                    vi.fn()
                        .mockRejectedValueOnce(
                            new Error(
                                'auth-required: authentication required'
                            )
                        )
                        .mockResolvedValueOnce(
                            'published'
                        );


                const auth =
                    vi.fn(
                        async (
                            signAuthEvent
                        ) => {

                            expect(
                                signAuthEvent
                            ).toBeTypeOf(
                                'function'
                            );


                            return 'authenticated';
                        }
                    );


                const close =
                    vi.fn();


                const relay = {
                    publish,
                    auth,
                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const publisher =
                    new NostrToolsEventPublisher(
                        signer,
                        connectRelay
                    );


                await publisher.publish(
                    'wss://relay.example',
                    event
                );


                expect(
                    publish
                ).toHaveBeenCalledTimes(
                    2
                );


                expect(
                    publish
                ).toHaveBeenNthCalledWith(
                    1,
                    event
                );


                expect(
                    publish
                ).toHaveBeenNthCalledWith(
                    2,
                    event
                );


                expect(
                    auth
                ).toHaveBeenCalledOnce();


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );

        it(
            'does not retry indefinitely when authentication is still required',
            async () => {

                const event = {
                    id:
                        'a'.repeat(
                            64
                        ),

                    pubkey:
                        'b'.repeat(
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


                const publish =
                    vi.fn()
                        .mockRejectedValueOnce(
                            new Error(
                                'auth-required: authentication required'
                            )
                        )
                        .mockRejectedValueOnce(
                            new Error(
                                'auth-required: authentication still required'
                            )
                        );


                const auth =
                    vi.fn(
                        async () =>
                            'authenticated'
                    );


                const close =
                    vi.fn();


                const relay = {
                    publish,
                    auth,
                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const publisher =
                    new NostrToolsEventPublisher(
                        signer,
                        connectRelay
                    );


                await expect(
                    publisher.publish(
                        'wss://relay.example',
                        event
                    )
                ).rejects.toThrow(
                    'auth-required: authentication still required'
                );


                expect(
                    publish
                ).toHaveBeenCalledTimes(
                    2
                );


                expect(
                    auth
                ).toHaveBeenCalledOnce();


                expect(
                    publish
                ).toHaveBeenNthCalledWith(
                    1,
                    event
                );


                expect(
                    publish
                ).toHaveBeenNthCalledWith(
                    2,
                    event
                );


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );
    }
);