import {
    generateSecretKey
} from 'nostr-tools/pure';

import {
    nip19
} from 'nostr-tools';

import {
    bytesToHex,
    hexToBytes
} from 'nostr-tools/utils';

import type {
    Nip07
} from 'nostr-typedef';

import type {
    AuthenticationResult,
    AuthenticationStrategy,
    ExportableAuthenticationSecret
} from '$lib/application';

import {
    NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

///////////////////////////////////////////////////////////////////////////////

export const NOSTR_LOGIN_STORAGE_KEY =
    `${import.meta.env.VITE_APP_NAME}:login`;

export const NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY =
    `${import.meta.env.VITE_APP_NAME}:login:bunker:client-seckey`;

export const NIP07_LOGIN_VALUE =
    'NIP-07';

export const NIP07_EXTENSION_WAIT_MS =
    10_000;

///////////////////////////////////////////////////////////////////////////////

type AuthenticationStorage =
    Pick<
        Storage,
        'getItem' |
        'setItem'
    >;

type NostrAuthenticationSigner =
    Pick<
        NostrSigner,
        'useNip07' |
        'useNsec' |
        'connectNip46' |
        'getPublicKey' |
        'clear'
    >;

type WaitForNip07 =
    (
        timeoutMilliseconds:
            number
    ) => Promise<
        Nip07.Nostr |
        undefined
    >;

type Nip46AuthHandler =
    (
        url: string
    ) => void;

type NostrAuthenticationOptions = {
    readonly waitForNip07?:
        WaitForNip07;
    readonly onNip46Auth?:
        Nip46AuthHandler;
};

///////////////////////////////////////////////////////////////////////////////

async function defaultWaitForNip07(
    timeoutMilliseconds:
        number
): Promise<
    Nip07.Nostr |
    undefined
> {

    const {
        waitNostr
    } = await import(
        'nip07-awaiter'
    );

    return await waitNostr(
        timeoutMilliseconds
    ) as Nip07.Nostr |
        undefined;
}

///////////////////////////////////////////////////////////////////////////////

export class NostrAuthenticationStrategy
    implements AuthenticationStrategy {

    private readonly waitForNip07:
        WaitForNip07;

    private readonly onNip46Auth:
        Nip46AuthHandler;

    constructor(
        private readonly storage:
            AuthenticationStorage,
        private readonly signer:
            NostrAuthenticationSigner,
        options:
            NostrAuthenticationOptions =
            { }
    ) {
        this.waitForNip07 =
            options.waitForNip07 ??
            defaultWaitForNip07;

        this.onNip46Auth =
            options.onNip46Auth ??
            (() => { });
    }

    ///////////////////////////////////////////////////////////////////////////

    tryGetExportableSecret():
        ExportableAuthenticationSecret |
        undefined {

        const savedLogin =
            this.storage.getItem(
                NOSTR_LOGIN_STORAGE_KEY
            );

        if (
            savedLogin ===
            null ||
            !savedLogin.startsWith(
                'nsec'
            )
        ) {
            return undefined;
        }

        return {
            type:
                'nsec',
            value:
                savedLogin
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    async createIdentity():
        Promise<
            AuthenticationResult
        > {

        const secretKey =
            generateSecretKey();

        try {
            return await this.login(
                nip19.nsecEncode(
                    secretKey
                )
            );
        } finally {
            secretKey.fill(0);
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    async tryLogin():
        Promise<
            AuthenticationResult |
            null
        > {

        const savedLogin =
            this.storage.getItem(
                NOSTR_LOGIN_STORAGE_KEY
            );

        /*
         * Saved-login restoration is authoritative for the
         * shared signer. Never leave a signer from a previous
         * account active when restoration fails or resolves to
         * a read-only identity.
         */
        await this.signer.clear();

        if (
            savedLogin ===
            null
        ) {
            return null;
        }

        if (
            savedLogin ===
            NIP07_LOGIN_VALUE
        ) {
            return this.restoreNip07();
        }

        if (
            savedLogin.startsWith(
                'bunker://'
            )
        ) {
            return this.restoreNip46(
                savedLogin
            );
        }

        if (
            savedLogin.startsWith(
                'nsec'
            )
        ) {
            return this.restoreNsec(
                savedLogin
            );
        }

        if (
            savedLogin.startsWith(
                'npub'
            )
        ) {
            return this.restoreNpub(
                savedLogin
            );
        }

        return null;
    }

    ///////////////////////////////////////////////////////////////////////////

    async login(
        credentials: string
    ): Promise<
        AuthenticationResult
    > {

        const decoded =
            nip19.decode(
                credentials
            );

        if (
            decoded.type !==
            'nsec'
        ) {
            throw new Error(
                'Expected Nostr nsec credentials.'
            );
        }

        await this.signer.useNsec(
            credentials
        );

        const authenticated = {
            status:
                'authenticated' as const,
            userId:
                await this.signer
                    .getPublicKey()
        };

        this.storage.setItem(
            NOSTR_LOGIN_STORAGE_KEY,
            credentials
        );

        return authenticated;
    }

    ///////////////////////////////////////////////////////////////////////////

    private async restoreNip07():
        Promise<
            AuthenticationResult |
            null
        > {

        const nip07 =
            await this.waitForNip07(
                NIP07_EXTENSION_WAIT_MS
            );

        if (
            nip07 ===
            undefined
        ) {
            return null;
        }

        await this.signer.useNip07(
            nip07
        );

        return {
            status:
                'authenticated',
            userId:
                await this.signer
                    .getPublicKey()
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private async restoreNip46(
        bunker: string
    ): Promise<
        AuthenticationResult
    > {

        const clientSecretKey =
            this.loadOrCreateNip46ClientSecretKey();

        const pubkey =
            await this.signer
                .connectNip46(
                    bunker,
                    clientSecretKey,
                    this.onNip46Auth
                );

        return {
            status:
                'authenticated',
            userId:
                pubkey
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private async restoreNsec(
        nsec: string
    ): Promise<
        AuthenticationResult
    > {

        await this.signer.useNsec(
            nsec
        );

        return {
            status:
                'authenticated',
            userId:
                await this.signer
                    .getPublicKey()
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private async restoreNpub(
        npub: string
    ): Promise<
        AuthenticationResult
    > {

        const decoded =
            nip19.decode(
                npub
            );

        if (
            decoded.type !==
            'npub' ||
            typeof decoded.data !==
            'string'
        ) {
            throw new Error(
                'Expected a Nostr npub.'
            );
        }

        return {
            status:
                'read-only',
            userId:
                decoded.data
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private loadOrCreateNip46ClientSecretKey():
        Uint8Array {

        const saved =
            this.storage.getItem(
                NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY
            );

        if (
            saved !==
            null
        ) {
            return hexToBytes(
                saved
            );
        }

        const secretKey =
            generateSecretKey();

        this.storage.setItem(
            NOSTR_NIP46_CLIENT_SECRET_STORAGE_KEY,
            bytesToHex(
                secretKey
            )
        );

        return secretKey;
    }
}
