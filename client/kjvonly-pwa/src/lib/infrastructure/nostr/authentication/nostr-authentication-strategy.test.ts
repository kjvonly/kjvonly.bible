import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    generateSecretKey,
    getPublicKey,
    nip19
} from 'nostr-tools';

import type {
    Nip07
} from 'nostr-typedef';

import {
    NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
    NIP07_EXTENSION_WAIT_MS,
    NIP07_LOGIN_VALUE,
    NOSTR_LOGIN_STORAGE_KEY,
    NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY,
    NostrAuthenticationStrategy
} from './nostr-authentication-strategy';

///////////////////////////////////////////////////////////////////////////////

function createStorage(
    values:
        Record<string, string> =
        { }
): Pick<
    Storage,
    'getItem' |
    'setItem'
> {

    const storage =
        new Map(
            Object.entries(
                values
            )
        );

    return {
        getItem:
            (key: string) =>
                storage.get(key) ??
                null,

        setItem:
            (
                key: string,
                value: string
            ) => {
                storage.set(
                    key,
                    value
                );
            }
    };
}

///////////////////////////////////////////////////////////////////////////////

describe(
    'NostrAuthenticationStrategy',
    () => {
        it(
            'returns null when no saved login exists',
            async () => {
                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage(),
                        new NostrSigner()
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toBeNull();
            }
        );

        it(
            'logs in with an nsec, configures the shared signer, and saves the login',
            async () => {
                const secretKey =
                    generateSecretKey();

                const nsec =
                    nip19.nsecEncode(
                        secretKey
                    );

                const signer =
                    new NostrSigner();

                const storage =
                    createStorage();

                const setItem =
                    vi.spyOn(
                        storage,
                        'setItem'
                    );

                const authentication =
                    new NostrAuthenticationStrategy(
                        storage,
                        signer
                    );

                const pubkey =
                    getPublicKey(
                        secretKey
                    );

                await expect(
                    authentication
                        .login(
                            nsec
                        )
                ).resolves.toEqual({
                    status:
                        'authenticated',
                    userId:
                        pubkey
                });

                expect(
                    setItem
                ).toHaveBeenCalledWith(
                    NOSTR_LOGIN_STORAGE_KEY,
                    nsec
                );

                expect(
                    await signer
                        .getPublicKey()
                ).toBe(pubkey);
            }
        );

        it(
            'does not save an invalid nsec login',
            async () => {
                const storage =
                    createStorage();

                const setItem =
                    vi.spyOn(
                        storage,
                        'setItem'
                    );

                const authentication =
                    new NostrAuthenticationStrategy(
                        storage,
                        new NostrSigner()
                    );

                await expect(
                    authentication
                        .login(
                            'not-an-nsec'
                        )
                ).rejects.toThrow();

                expect(
                    setItem
                ).not.toHaveBeenCalled();
            }
        );

        it(
            'restores an nsec login into the shared signer',
            async () => {
                const secretKey =
                    generateSecretKey();

                const nsec =
                    nip19.nsecEncode(
                        secretKey
                    );

                const signer =
                    new NostrSigner();

                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage({
                            [NOSTR_LOGIN_STORAGE_KEY]:
                                nsec
                        }),
                        signer
                    );

                const restored =
                    await authentication
                        .tryLogin();

                const pubkey =
                    getPublicKey(
                        secretKey
                    );

                expect(
                    restored
                ).toEqual({
                    status:
                        'authenticated',
                    userId:
                        pubkey
                });

                expect(
                    await signer
                        .getPublicKey()
                ).toBe(pubkey);
            }
        );

        it(
            'waits for and restores a saved NIP-07 login',
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

                const waitForNip07 =
                    vi.fn(
                        async (
                            _timeoutMilliseconds:
                                number
                        ) =>
                            nip07
                    );

                const signer =
                    new NostrSigner();

                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage({
                            [NOSTR_LOGIN_STORAGE_KEY]:
                                NIP07_LOGIN_VALUE
                        }),
                        signer,
                        {
                            waitForNip07
                        }
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toEqual({
                    status:
                        'authenticated',
                    userId:
                        pubkey
                });

                expect(
                    waitForNip07
                ).toHaveBeenCalledWith(
                    NIP07_EXTENSION_WAIT_MS
                );

                expect(
                    await signer
                        .getPublicKey()
                ).toBe(pubkey);
            }
        );

        it(
            'returns null when the saved NIP-07 extension is unavailable',
            async () => {
                const waitForNip07 =
                    vi.fn(
                        async (
                            _timeoutMilliseconds:
                                number
                        ) =>
                            undefined
                    );

                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage({
                            [NOSTR_LOGIN_STORAGE_KEY]:
                                NIP07_LOGIN_VALUE
                        }),
                        new NostrSigner(),
                        {
                            waitForNip07
                        }
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toBeNull();
            }
        );

        it(
            'restores a saved NIP-46 login and persists its client secret',
            async () => {
                const bunker =
                    'bunker://example';

                const pubkey =
                    'b'.repeat(64);

                const onNip46Auth =
                    vi.fn();

                const connectNip46 =
                    vi.fn(
                        async (
                            _bunker:
                                string,
                            _clientSecretKey:
                                Uint8Array,
                            _authHandler?:
                                (url: string) => void
                        ) =>
                            pubkey
                    );

                const signer = {
                    useNip07:
                        vi.fn(),
                    useNsec:
                        vi.fn(),
                    connectNip46,
                    getPublicKey:
                        vi.fn(),
                    clear:
                        vi.fn()
                } as unknown as NostrSigner;

                const storage =
                    createStorage({
                        [NOSTR_LOGIN_STORAGE_KEY]:
                            bunker
                    });

                const setItem =
                    vi.spyOn(
                        storage,
                        'setItem'
                    );

                const authentication =
                    new NostrAuthenticationStrategy(
                        storage,
                        signer,
                        {
                            onNip46Auth
                        }
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toEqual({
                    status:
                        'authenticated',
                    userId:
                        pubkey
                });

                expect(
                    connectNip46
                ).toHaveBeenCalledOnce();

                const [
                    calledBunker,
                    clientSecretKey,
                    authHandler
                ] = connectNip46
                    .mock.calls[0]!;

                expect(
                    calledBunker
                ).toBe(bunker);

                expect(
                    clientSecretKey
                ).toBeInstanceOf(
                    Uint8Array
                );

                expect(
                    clientSecretKey
                        .length
                ).toBe(32);

                expect(
                    setItem
                ).toHaveBeenCalledWith(
                    NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY,
                    expect.stringMatching(
                        /^[0-9a-f]{64}$/
                    )
                );

                authHandler?.(
                    'https://auth.example'
                );

                expect(
                    onNip46Auth
                ).toHaveBeenCalledWith(
                    'https://auth.example'
                );
            }
        );

        it(
            'reuses the saved NIP-46 client secret',
            async () => {
                const bunker =
                    'bunker://example';

                const savedClientSecret =
                    '11'.repeat(32);

                const connectNip46 =
                    vi.fn(
                        async (
                            _bunker:
                                string,
                            _clientSecretKey:
                                Uint8Array,
                            _authHandler?:
                                (url: string) => void
                        ) =>
                            'c'.repeat(64)
                    );

                const signer = {
                    useNip07:
                        vi.fn(),
                    useNsec:
                        vi.fn(),
                    connectNip46,
                    getPublicKey:
                        vi.fn(),
                    clear:
                        vi.fn()
                } as unknown as NostrSigner;

                const storage =
                    createStorage({
                        [NOSTR_LOGIN_STORAGE_KEY]:
                            bunker,
                        [NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY]:
                            savedClientSecret
                    });

                const setItem =
                    vi.spyOn(
                        storage,
                        'setItem'
                    );

                const authentication =
                    new NostrAuthenticationStrategy(
                        storage,
                        signer
                    );

                await authentication
                    .tryLogin();

                const clientSecretKey =
                    connectNip46
                        .mock.calls[0]![1];

                expect(
                    Array.from(
                        clientSecretKey
                    )
                ).toEqual(
                    new Array(32)
                        .fill(0x11)
                );

                expect(
                    setItem
                ).not.toHaveBeenCalled();
            }
        );

        it(
            'restores an npub as a read-only identity without configuring a signer',
            async () => {
                const pubkey =
                    getPublicKey(
                        generateSecretKey()
                    );

                const npub =
                    nip19.npubEncode(
                        pubkey
                    );

                const clear =
                    vi.fn();

                const signer = {
                    useNip07:
                        vi.fn(),
                    useNsec:
                        vi.fn(),
                    connectNip46:
                        vi.fn(),
                    getPublicKey:
                        vi.fn(),
                    clear
                } as unknown as NostrSigner;

                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage({
                            [NOSTR_LOGIN_STORAGE_KEY]:
                                npub
                        }),
                        signer
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toEqual({
                    status:
                        'read-only',
                    userId:
                        pubkey
                });

                expect(
                    clear
                ).toHaveBeenCalledOnce();
            }
        );

        it(
            'rejects unsupported saved login values',
            async () => {
                const authentication =
                    new NostrAuthenticationStrategy(
                        createStorage({
                            [NOSTR_LOGIN_STORAGE_KEY]:
                                'unsupported'
                        }),
                        new NostrSigner()
                    );

                await expect(
                    authentication.tryLogin()
                ).resolves.toBeNull();
            }
        );
    }
);
