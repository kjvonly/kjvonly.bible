import {
    finalizeEvent,
    getPublicKey,
    nip19
} from 'nostr-tools';

import {
    BunkerSigner,
    parseBunkerInput
} from 'nostr-tools/nip46';

import {
    now,
    type EventSigner
} from 'rx-nostr';

import type {
    Event,
    EventParameters,
    Nip07
} from 'nostr-typedef';

export type NostrSignerMode =
    | 'nip07'
    | 'nsec'
    | 'nip46';

export type Nip46AuthHandler =
    (url: string) => void;

type SignerState =
    | {
        mode: 'nip07';
        signer: Nip07.Nostr;
    }
    | {
        mode: 'nsec';
        secretKey: Uint8Array;
    }
    | {
        mode: 'nip46';
        signer: BunkerSigner;
        pubkey: string;
    };

export class NostrSigner
    implements EventSigner {
    private state:
        SignerState | undefined;

    constructor(
        private readonly clock:
            () => number = now
    ) { }

    async useNip07(
        signer: Nip07.Nostr
    ): Promise<void> {
        await this.replaceState({
            mode: 'nip07',
            signer
        });
    }

    async useSecretKey(
        secretKey: Uint8Array
    ): Promise<void> {
        if (secretKey.length !== 32) {
            throw new Error(
                'Nostr secret key must be 32 bytes.'
            );
        }

        await this.replaceState({
            mode: 'nsec',

            /**
             * Own our copy so application code cannot mutate the
             * active signing key after configuration.
             */
            secretKey:
                secretKey.slice()
        });
    }

    async useNsec(
        nsec: string
    ): Promise<void> {
        const decoded =
            nip19.decode(nsec);

        if (decoded.type !== 'nsec') {
            throw new Error(
                'Expected a Nostr nsec.'
            );
        }

        await this.useSecretKey(
            decoded.data
        );
    }

    async connectNip46(
        bunker: string,
        clientSecretKey: Uint8Array,
        onAuth?: Nip46AuthHandler
    ): Promise<string> {
        if (clientSecretKey.length !== 32) {
            throw new Error(
                'NIP-46 client secret key must be 32 bytes.'
            );
        }

        const bunkerPointer =
            await parseBunkerInput(
                bunker
            );

        if (!bunkerPointer) {
            throw new Error(
                'Invalid NIP-46 bunker URL.'
            );
        }

        const bunkerSigner =
            BunkerSigner.fromBunker(
                clientSecretKey,
                bunkerPointer,
                {
                    /**
                     * The signer does not decide how auth URLs
                     * are presented. Application/UI code owns
                     * that behavior.
                     */
                    onauth:
                        onAuth ??
                        (() => { })
                }
            );

        try {
            await bunkerSigner.connect();

            const pubkey =
                await bunkerSigner
                    .getPublicKey();

            await this.replaceState({
                mode: 'nip46',
                signer:
                    bunkerSigner,
                pubkey
            });

            return pubkey;
        } catch (cause) {
            await bunkerSigner
                .close()
                .catch(() => { });

            throw cause;
        }
    }

    async clear(): Promise<void> {
        const current =
            this.state;

        if (current === undefined) {
            return;
        }

        await this.disposeState(
            current
        );

        this.state = undefined;
    }

    async getPublicKey():
        Promise<string> {
        const state =
            this.requireState();

        switch (state.mode) {
            case 'nip07':
                return state.signer
                    .getPublicKey();

            case 'nsec':
                return getPublicKey(
                    state.secretKey
                );

            case 'nip46':
                return state.pubkey;
        }
    }
    async signEvent<K extends number>(
        params: EventParameters<K>
    ): Promise<Event<K>> {
        const state =
            this.requireState();

        const event = {
            ...params,

            tags:
                params.tags ?? [],

            created_at:
                params.created_at ??
                this.clock()
        };

        switch (state.mode) {
            case 'nip07':
                return (
                    await state.signer
                        .signEvent(event)
                ) as Event<K>;

            case 'nsec':
                return finalizeEvent(
                    event,
                    state.secretKey
                ) as unknown as Event<K>;

            case 'nip46':
                return (
                    await state.signer
                        .signEvent(event)
                ) as unknown as Event<K>;
        }
    }


    private requireState():
        SignerState {
        if (this.state === undefined) {
            throw new Error(
                'Nostr signer is not configured.'
            );
        }

        return this.state;
    }

    private async replaceState(
        next: SignerState
    ): Promise<void> {
        const previous =
            this.state;

        if (previous !== undefined) {
            await this.disposeState(
                previous
            );
        }

        this.state = next;
    }

    private async disposeState(
        state: SignerState
    ): Promise<void> {
        switch (state.mode) {
            case 'nip46':
                await state.signer.close();
                return;

            case 'nsec':
                /**
                 * Best-effort cleanup of the copy owned by this
                 * signer. JavaScript cannot guarantee that all
                 * historical memory copies are erased.
                 */
                state.secretKey.fill(0);
                return;

            case 'nip07':
                return;
        }
    }
}