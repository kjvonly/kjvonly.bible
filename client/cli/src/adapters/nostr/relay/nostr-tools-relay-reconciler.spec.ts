import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    nip77
} from 'nostr-tools';

import {
    NostrToolsRelayReconciler
} from './nostr-tools-relay-reconciler.js';

import type {
    NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';
import { Logger } from '#ports/logging/logger.js';
import { EventSigner } from '#ports/nostr/event-signer.js';

function createSigner():
    EventSigner {

    return {
        getPublicKey:
            vi.fn(
                async () =>
                    'c'.repeat(
                        64
                    )
            ),

        sign:
            vi.fn()
    };
}


function createLogger():
    Logger {

    return {
        verbose:
            vi.fn()
    };
}


describe(
    'NostrToolsRelayReconciler',
    () => {

        it(
            'reconciles one relay and closes the connection',
            async () => {

                const publisher =
                    'c'.repeat(
                        64
                    );


                const localId =
                    'a'.repeat(
                        64
                    );


                let oncustom:
                    (
                        data:
                            string[]
                    ) => void =
                    () => { };


                const remoteStorage =
                    new nip77
                        .NegentropyStorageVector();


                remoteStorage.seal();


                const remoteNegentropy =
                    new nip77
                        .Negentropy(
                            remoteStorage
                        );


                const close =
                    vi.fn();


                const relay = {
                    prepareSubscription:
                        vi.fn(
                            (
                                _filters,
                                params
                            ) => {

                                expect(
                                    params.label
                                ).toBe(
                                    'negentropy'
                                );


                                return {
                                    id:
                                        'negentropy:1',

                                    get oncustom() {

                                        return oncustom;
                                    },

                                    set oncustom(
                                        handler:
                                            (
                                                data:
                                                    string[]
                                            ) => void
                                    ) {

                                        oncustom =
                                            handler;
                                    },

                                    close:
                                        vi.fn()
                                };
                            }
                        ),

                    send:
                        vi.fn(
                            async (
                                message:
                                    string
                            ) => {

                                const data =
                                    JSON.parse(
                                        message
                                    );


                                if (
                                    data[0] !==
                                    'NEG-OPEN'
                                ) {
                                    return;
                                }


                                expect(
                                    data[2]
                                ).toEqual({
                                    authors: [
                                        publisher
                                    ],

                                    kinds: [
                                        37770
                                    ]
                                });


                                queueMicrotask(
                                    () => {

                                        oncustom([
                                            'NEG-MSG',
                                            'negentropy:1',
                                            remoteNegentropy
                                                .initiate()
                                        ]);
                                    }
                                );
                            }
                        ),

                    publish:
                        vi.fn(),

                    auth:
                        vi.fn(),

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        createSigner(),
                        connectRelay,
                        createLogger()
                    );


                await expect(
                    reconciler.reconcile({
                        relay:
                            'wss://relay.example',

                        publisher,

                        kind:
                            37770,

                        events: [
                            {
                                eventId:
                                    localId,

                                createdAt:
                                    1000
                            }
                        ]
                    })
                ).resolves.toEqual([
                    localId
                ]);


                expect(
                    connectRelay
                ).toHaveBeenCalledWith(
                    'wss://relay.example'
                );


                expect(
                    relay.auth
                ).not.toHaveBeenCalled();


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );


        it(
            'closes the relay when reconciliation fails',
            async () => {

                const close =
                    vi.fn();


                const relay = {
                    prepareSubscription:
                        vi.fn(
                            () => ({
                                id:
                                    'negentropy:1',

                                oncustom:
                                    undefined,

                                close:
                                    vi.fn()
                            })
                        ),

                    send:
                        vi.fn(
                            async () => {

                                throw new Error(
                                    'reconciliation failed'
                                );
                            }
                        ),

                    publish:
                        vi.fn(),

                    auth:
                        vi.fn(),

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        createSigner(),
                        connectRelay,
                        createLogger()
                    );


                await expect(
                    reconciler.reconcile({
                        relay:
                            'wss://relay.example',

                        publisher:
                            'a'.repeat(
                                64
                            ),

                        kind:
                            37770,

                        events:
                            []
                    })
                ).rejects.toThrow(
                    'reconciliation failed'
                );


                expect(
                    relay.auth
                ).not.toHaveBeenCalled();


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );


        it(
            'authenticates and retries once when reconciliation requires auth',
            async () => {

                const publisher =
                    'c'.repeat(
                        64
                    );


                const localId =
                    'a'.repeat(
                        64
                    );


                let oncustom:
                    (
                        data:
                            string[]
                    ) => void =
                    () => { };


                let negOpenCount =
                    0;


                const remoteStorage =
                    new nip77
                        .NegentropyStorageVector();


                remoteStorage.seal();


                const remoteNegentropy =
                    new nip77
                        .Negentropy(
                            remoteStorage
                        );


                const close =
                    vi.fn();

                const auth =
                    vi.fn(
                        async (
                            _signAuthEvent:
                                NostrToolsAuthSigner
                        ) =>
                            'authenticated'
                    );


                const relay = {
                    prepareSubscription:
                        vi.fn(
                            () => ({
                                id:
                                    `negentropy:${negOpenCount + 1}`,

                                get oncustom() {

                                    return oncustom;
                                },

                                set oncustom(
                                    handler:
                                        (
                                            data:
                                                string[]
                                        ) => void
                                ) {

                                    oncustom =
                                        handler;
                                },

                                close:
                                    vi.fn()
                            })
                        ),

                    send:
                        vi.fn(
                            async (
                                message:
                                    string
                            ) => {

                                const data =
                                    JSON.parse(
                                        message
                                    );


                                if (
                                    data[0] !==
                                    'NEG-OPEN'
                                ) {
                                    return;
                                }


                                negOpenCount +=
                                    1;


                                if (
                                    negOpenCount ===
                                    1
                                ) {
                                    queueMicrotask(
                                        () => {

                                            oncustom([
                                                'NEG-ERR',
                                                'negentropy:1',
                                                'auth-required: authentication required'
                                            ]);
                                        }
                                    );

                                    return;
                                }


                                queueMicrotask(
                                    () => {

                                        oncustom([
                                            'NEG-MSG',
                                            'negentropy:2',
                                            remoteNegentropy
                                                .initiate()
                                        ]);
                                    }
                                );
                            }
                        ),

                    auth,

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        createSigner(),
                        connectRelay,
                        createLogger()
                    );


                await expect(
                    reconciler.reconcile({
                        relay:
                            'wss://relay.example',

                        publisher,

                        kind:
                            37770,

                        events: [
                            {
                                eventId:
                                    localId,

                                createdAt:
                                    1000
                            }
                        ]
                    })
                ).resolves.toEqual([
                    localId
                ]);


                expect(
                    auth
                ).toHaveBeenCalledOnce();


                expect(
                    typeof auth.mock.calls[0]?.[0]
                ).toBe(
                    'function'
                );


                expect(
                    negOpenCount
                ).toBe(
                    2
                );


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );


        it(
            'does not retry authentication more than once',
            async () => {

                let oncustom:
                    (
                        data:
                            string[]
                    ) => void =
                    () => { };


                let negOpenCount =
                    0;


                const close =
                    vi.fn();


                const auth =
                    vi.fn(
                        async () =>
                            'authenticated'
                    );


                const relay = {
                    prepareSubscription:
                        vi.fn(
                            () => ({
                                id:
                                    `negentropy:${negOpenCount + 1}`,

                                get oncustom() {

                                    return oncustom;
                                },

                                set oncustom(
                                    handler:
                                        (
                                            data:
                                                string[]
                                        ) => void
                                ) {

                                    oncustom =
                                        handler;
                                },

                                close:
                                    vi.fn()
                            })
                        ),

                    send:
                        vi.fn(
                            async (
                                message:
                                    string
                            ) => {

                                const data =
                                    JSON.parse(
                                        message
                                    );


                                if (
                                    data[0] !==
                                    'NEG-OPEN'
                                ) {
                                    return;
                                }


                                negOpenCount +=
                                    1;


                                const subscriptionId =
                                    `negentropy:${negOpenCount}`;


                                queueMicrotask(
                                    () => {

                                        oncustom([
                                            'NEG-ERR',
                                            subscriptionId,
                                            'auth-required: authentication required'
                                        ]);
                                    }
                                );
                            }
                        ),

                    auth,

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        createSigner(),
                        connectRelay,
                        createLogger()
                    );


                await expect(
                    reconciler.reconcile({
                        relay:
                            'wss://relay.example',

                        publisher:
                            'c'.repeat(
                                64
                            ),

                        kind:
                            37770,

                        events:
                            []
                    })
                ).rejects.toThrow(
                    'Relay rejected Negentropy reconciliation: auth-required: authentication required'
                );


                expect(
                    auth
                ).toHaveBeenCalledOnce();


                expect(
                    negOpenCount
                ).toBe(
                    2
                );


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );
    }
);
