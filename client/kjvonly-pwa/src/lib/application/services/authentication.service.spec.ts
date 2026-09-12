import {
    describe,
    expect,
    it
} from 'vitest';

import {
    getPublicKey,
    nip19
} from 'nostr-tools';

import {
    AuthenticationService,
    LOGIN_STORAGE_KEY
} from './authentication.service';

///////////////////////////////////////////////////////////////////////////////

function createStorage(
    login:
        string |
        null
): Pick<Storage, 'getItem'> {

    return {
        getItem:
            (key: string) => {
                if (
                    key !==
                    LOGIN_STORAGE_KEY
                ) {
                    return null;
                }

                return login;
            }
    };
}

///////////////////////////////////////////////////////////////////////////////

describe(
    'AuthenticationService',
    () => {
        it(
            'derives the canonical hex pubkey from the saved nsec login',
            () => {
                const secretKey =
                    new Uint8Array(
                        32
                    );

                secretKey[31] =
                    1;

                const service =
                    new AuthenticationService(
                        createStorage(
                            nip19.nsecEncode(
                                secretKey
                            )
                        )
                    );

                expect(
                    service.getPubkey()
                ).toBe(
                    getPublicKey(
                        secretKey
                    )
                );
            }
        );

        it(
            'returns undefined when the current pubkey is unavailable',
            () => {
                const service =
                    new AuthenticationService(
                        createStorage(
                            null
                        )
                    );

                expect(
                    service.tryGetPubkey()
                ).toBeUndefined();
            }
        );

        it(
            'fails when no saved login exists',
            () => {
                const service =
                    new AuthenticationService(
                        createStorage(
                            null
                        )
                    );

                expect(
                    () =>
                        service.getPubkey()
                ).toThrow(
                    'No saved login is available.'
                );
            }
        );

        it(
            'fails when the saved login uses an unsupported authentication method',
            () => {
                const service =
                    new AuthenticationService(
                        createStorage(
                            'npub1unsupported'
                        )
                    );

                expect(
                    () =>
                        service.getPubkey()
                ).toThrow(
                    'Only nsec authentication is currently supported.'
                );
            }
        );

        it(
            'fails when the saved nsec is invalid',
            () => {
                const service =
                    new AuthenticationService(
                        createStorage(
                            'nsec1invalid'
                        )
                    );

                expect(
                    () =>
                        service.getPubkey()
                ).toThrow(
                    'Saved nsec login is invalid.'
                );
            }
        );
    }
);
