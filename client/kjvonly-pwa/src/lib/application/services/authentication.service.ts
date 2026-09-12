import {
    getPublicKey,
    nip19
} from 'nostr-tools';

///////////////////////////////////////////////////////////////////////////////

export const LOGIN_STORAGE_KEY =
    'KJVonly:login';

///////////////////////////////////////////////////////////////////////////////

export class AuthenticationService {

    constructor(
        private readonly storage:
            Pick<Storage, 'getItem'>
    ) {}

    ///////////////////////////////////////////////////////////////////////////

    tryGetPubkey():
        string |
        undefined {

        try {
            return this.getPubkey();
        } catch {
            return undefined;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    getPubkey():
        string {

        const login =
            this.storage.getItem(
                LOGIN_STORAGE_KEY
            );

        if (
            login ===
            null
        ) {
            throw new Error(
                'No saved login is available.'
            );
        }

        if (
            !login.startsWith(
                'nsec'
            )
        ) {
            throw new Error(
                'Only nsec authentication is currently supported.'
            );
        }

        let decoded:
            ReturnType<typeof nip19.decode>;

        try {
            decoded =
                nip19.decode(
                    login
                );
        } catch {
            throw new Error(
                'Saved nsec login is invalid.'
            );
        }

        if (
            decoded.type !==
            'nsec'
        ) {
            throw new Error(
                'Saved login is not an nsec.'
            );
        }

        return getPublicKey(
            decoded.data
        );
    }
}
