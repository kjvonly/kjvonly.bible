import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    nip77
} from 'nostr-tools';

import type {
    Logger
} from '../../ports/logging/logger.js';

import {
    createNostrToolsNegentropyStorage
} from './nostr-tools-negentropy-storage.js';

import {
    NostrToolsNegentropyError,
    reconcileNostrToolsNegentropy
} from './nostr-tools-negentropy-session.js';


function createLogger():
    Logger {

    return {
        verbose:
            vi.fn()
    };
}


describe(
    'reconcileNostrToolsNegentropy',
    () => {

        it(
            'returns event IDs that exist locally but not remotely',
            async () => {

                const sharedId =
                    'a'.repeat(
                        64
                    );


                const missingId =
                    'b'.repeat(
                        64
                    );


                const localStorage =
                    createNostrToolsNegentropyStorage([
                        {
                            eventId:
                                sharedId,

                            createdAt:
                                1000
                        },
                        {
                            eventId:
                                missingId,

                            createdAt:
                                1001
                        }
                    ]);


                const remoteStorage =
                    createNostrToolsNegentropyStorage([
                        {
                            eventId:
                                sharedId,

                            createdAt:
                                1000
                        }
                    ]);


                const remoteNegentropy =
                    new nip77
                        .Negentropy(
                            remoteStorage
                        );


                let oncustom:
                    (
                        data:
                            string[]
                    ) => void =
                    () => { };


                const close =
                    vi.fn();


                const relay = {
                    prepareSubscription:
                        vi.fn(
                            () => ({
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

                                close
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


                                const response =
                                    remoteNegentropy.initiate();


                                queueMicrotask(
                                    () => {

                                        oncustom([
                                            'NEG-MSG',
                                            'negentropy:1',
                                            response
                                        ]);
                                    }
                                );
                            }
                        )
                };


                await expect(
                    reconcileNostrToolsNegentropy(
                        relay,
                        localStorage,
                        {
                            authors: [
                                'c'.repeat(
                                    64
                                )
                            ],

                            kinds: [
                                37770
                            ]
                        },
                        createLogger()
                    )
                ).resolves.toEqual([
                    missingId
                ]);


                expect(
                    close
                ).toHaveBeenCalledOnce();
            }
        );


     it(
	'preserves the relay reason when the relay returns NEG-ERR',
	async () => {

		const storage =
			createNostrToolsNegentropyStorage(
				[]
			);


		let oncustom:
			(
				data:
					string[]
			) => void =
			() => { };


		const close =
			vi.fn();


		const relay = {
			prepareSubscription:
				vi.fn(
					() => ({
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

						close
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
							data[0] ===
							'NEG-OPEN'
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
						}
					}
				)
		};


		await expect(
			reconcileNostrToolsNegentropy(
				relay,
				storage,
				{
					authors: [
						'a'.repeat(
							64
						)
					],

					kinds: [
						37770
					]
				},
				createLogger()
			)
		).rejects.toMatchObject({
			name:
				NostrToolsNegentropyError
					.name,

			reason:
				'auth-required: authentication required'
		});


		expect(
			close
		).not.toHaveBeenCalled();
	}
);

        it(
            'rejects NEG-ERROR as a Negentropy error',
            async () => {

                let subscription:
                    {
                        readonly id:
                        string;

                        oncustom?:
                        (
                            data:
                                string[]
                        ) => void;

                        close():
                            void;
                    };


                const relay = {
                    prepareSubscription: vi.fn(
                        () => {

                            subscription = {
                                id:
                                    'negentropy:1',

                                close:
                                    vi.fn()
                            };


                            return subscription;
                        }
                    ),

                    send: vi.fn(
                        async () => {

                            queueMicrotask(
                                () => {

                                    subscription.oncustom?.([
                                        'NEG-ERROR',
                                        'negentropy:1',
                                        'auth-required: only authenticated users can read from this relay'
                                    ]);
                                }
                            );
                        }
                    )
                };


                const storage =
                    createNostrToolsNegentropyStorage(
                        []
                    );


                await expect(
                    reconcileNostrToolsNegentropy(
                        relay,
                        storage,
                        {
                            authors: [
                                '4de85ea7e103b98e4ea7aedefa53177f3349b1640e5951ae764cb403696477fd'
                            ],

                            kinds: [
                                37770
                            ]
                        },
                        createLogger()
                    )
                ).rejects.toMatchObject({
                    name:
                        'NostrToolsNegentropyError',

                    reason:
                        'auth-required: only authenticated users can read from this relay'
                });
            }
        );
    }
);