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

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        connectRelay
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

                    close
                };


                const connectRelay =
                    vi.fn(
                        async () =>
                            relay
                    );


                const reconciler =
                    new NostrToolsRelayReconciler(
                        connectRelay
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
                    close
                ).toHaveBeenCalledOnce();
            }
        );
    }
);