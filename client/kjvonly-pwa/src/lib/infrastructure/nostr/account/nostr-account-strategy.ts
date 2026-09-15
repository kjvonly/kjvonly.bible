import type {
    Event as SignedNostrEvent
} from 'nostr-typedef';

import type {
    AccountSetup,
    AccountStrategy
} from '$lib/application/services/account/account-strategy';

import type {
    AccountState
} from '$lib/application/services/account/account-state';

import {
    NostrAccountRelayProvider,
    type NostrAccountRelay,
    type NostrAccountRelaySubscriber
} from './nostr-account-relay-provider';

import {
    createReplaceableNostrEventKey,
    type NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

import type {
    NostrEventsService
} from '$lib/infrastructure/nostr/events/services/nostr-events.service';

import type {
    NostrClient,
    NostrRelay
} from '$lib/infrastructure/nostr/client/nostr-client';

///////////////////////////////////////////////////////////////////////////////

const ACCOUNT_EVENT_KINDS = [
    0,
    3,
    10002
] as const;

///////////////////////////////////////////////////////////////////////////////

type AccountNostrClient =
    Pick<
        NostrClient,
        | 'getEvent'
        | 'getEvents'
        | 'getPublicKey'
    >;

type AccountNostrEvents =
    Pick<
        NostrEventsService,
        | 'getByKindAndPubkey'
        | 'cache'
        | 'put'
    >;

///////////////////////////////////////////////////////////////////////////////

export class NostrAccountStrategy
    implements AccountStrategy {

    constructor(
        private readonly client:
            AccountNostrClient,

        private readonly events:
            AccountNostrEvents,

        private readonly relayProvider:
            NostrAccountRelayProvider,

        private readonly bootstrapRelays:
            readonly NostrRelay[],

        private readonly applicationPubkey:
            string
    ) { }

    ///////////////////////////////////////////////////////////////////////////

    getRelays():
        readonly NostrAccountRelay[] {

        return this.relayProvider
            .getRelays();
    }

    ///////////////////////////////////////////////////////////////////////////

    subscribeRelays(
        subscriber:
            NostrAccountRelaySubscriber
    ): () => void {

        return this.relayProvider
            .subscribe(
                subscriber
            );
    }

    ///////////////////////////////////////////////////////////////////////////

    async load(
        userId: string
    ): Promise<AccountState> {

        const [
            metadata,
            contacts,
            relayList
        ] = await Promise.all([
            this.events
                .getByKindAndPubkey(
                    0,
                    userId
                ),
            this.events
                .getByKindAndPubkey(
                    3,
                    userId
                ),
            this.events
                .getByKindAndPubkey(
                    10002,
                    userId
                )
        ]);

        this.setRelays(
            this.readRelayPreferences(
                relayList,
                contacts
            )
        );

        return this.createAccountState(
            metadata
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async refresh(
        userId: string
    ): Promise<AccountState> {

        const relays =
            this.bootstrapRelays
                .filter(({ read }) => read)
                .map(({ url }) => url);

        const fetched =
            await this.client
                .getEvents(
                    {
                        kinds:
                            [...ACCOUNT_EVENT_KINDS],
                        authors:
                            [userId]
                    },
                    { relays }
                );

        const current =
            this.currentByKind(
                fetched
            );

        for (
            const event
            of current.values()
        ) {
            await this.events.cache(
                event
            );
        }

        /*
         * The local Nostr event store is authoritative for
         * account state. A relay refresh may be partial, and
         * NostrEventsService may reject an older relay event
         * in favor of newer locally-authored state. Reload the
         * merged local state after caching accepted events.
         */
        return await this.load(
            userId
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async setup(
        account: AccountSetup
    ): Promise<void> {

        await this.assertSignerIdentity(
            account.userId
        );

        const relays =
            this.bootstrapRelays
                .filter(({ read }) => read)
                .map(({ url }) => url);

        const existingContacts =
            await this.client
                .getEvent(
                    {
                        kinds: [3],
                        authors:
                            [account.userId]
                    },
                    { relays }
                );

        await this.putMetadata(
            account
        );

        await this.putRelayList(
            account.userId
        );

        await this.putContacts(
            account.userId,
            existingContacts
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private async assertSignerIdentity(
        userId: string
    ): Promise<void> {

        const signerUserId =
            await this.client
                .getPublicKey();

        if (
            signerUserId !==
            userId
        ) {
            throw new Error(
                'Authenticated user does not match the active Nostr identity.'
            );
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    private async putMetadata(
        account: AccountSetup
    ): Promise<void> {

        await this.events.put(
            this.createEvent(
                account.userId,
                0,
                JSON.stringify({
                    name:
                        account.name,
                    display_name:
                        account.name
                }),
                []
            )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private async putRelayList(
        userId: string
    ): Promise<void> {

        await this.events.put(
            this.createEvent(
                userId,
                10002,
                '',
                this.bootstrapRelays
                    .map(
                        ({
                            url,
                            read,
                            write
                        }) => {
                            const tag =
                                ['r', url];

                            if (
                                read &&
                                !write
                            ) {
                                tag.push(
                                    'read'
                                );
                            } else if (
                                !read &&
                                write
                            ) {
                                tag.push(
                                    'write'
                                );
                            }

                            return tag;
                        }
                    )
            )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private async putContacts(
        userId: string,
        existing: SignedNostrEvent | null
    ): Promise<void> {

        await this.events.put(
            this.createEvent(
                userId,
                3,
                existing?.content ??
                    '',
                this.addApplicationFollow(
                    existing
                )
            )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private createEvent(
        pubkey: string,
        kind: number,
        content: string,
        tags:
            readonly (
                readonly string[]
            )[]
    ): NostrEvent {
        return {
            key:
                createReplaceableNostrEventKey(
                    kind,
                    pubkey
                ),
            pubkey,
            kind,
            content,
            tags
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private currentByKind(
        events:
            readonly SignedNostrEvent[]
    ): Map<number, SignedNostrEvent> {

        const current =
            new Map<
                number,
                SignedNostrEvent
            >();

        for (
            const event
            of events
        ) {
            if (
                !ACCOUNT_EVENT_KINDS
                    .includes(
                        event.kind as
                            typeof ACCOUNT_EVENT_KINDS[number]
                    ) ||
                current.has(
                    event.kind
                )
            ) {
                continue;
            }

            current.set(
                event.kind,
                event
            );
        }

        return current;
    }

    ///////////////////////////////////////////////////////////////////////////

    private createAccountState(
        metadata:
            Pick<
                NostrEvent,
                'content'
            > |
            SignedNostrEvent |
            undefined
    ): AccountState {

        const name =
            this.readName(
                metadata
            );

        return name === undefined
            ? {}
            : { name };
    }

    ///////////////////////////////////////////////////////////////////////////

    private readName(
        metadata:
            Pick<
                NostrEvent,
                'content'
            > |
            SignedNostrEvent |
            undefined
    ): string | undefined {

        if (
            metadata ===
            undefined
        ) {
            return undefined;
        }

        try {
            const profile =
                JSON.parse(
                    metadata.content
                ) as {
                    name?: unknown;
                    display_name?: unknown;
                };

            return typeof profile.name ===
                'string'
                ? profile.name
                : typeof profile.display_name ===
                    'string'
                    ? profile.display_name
                    : undefined;
        } catch {
            return undefined;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    private readRelayPreferences(
        relayList:
            Pick<
                NostrEvent,
                'tags'
            > |
            SignedNostrEvent |
            undefined,
        contacts:
            Pick<
                NostrEvent,
                'content'
            > |
            SignedNostrEvent |
            undefined
    ): readonly NostrAccountRelay[] |
        undefined {

        if (
            relayList !== undefined &&
            relayList.tags.length > 0
        ) {
            return this.readRelayTags(
                relayList.tags
            );
        }

        if (
            contacts === undefined ||
            contacts.content === ''
        ) {
            return undefined;
        }

        return this.readLegacyRelayContent(
            contacts.content
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private readRelayTags(
        tags:
            readonly (
                readonly string[]
            )[]
    ): readonly NostrAccountRelay[] {

        const relays =
            new Map<
                string,
                NostrAccountRelay
            >();

        for (
            const [
                name,
                url,
                permission
            ] of tags
        ) {
            if (
                name !== 'r' ||
                !this.isRelayUrl(
                    url
                )
            ) {
                continue;
            }

            const read =
                permission === undefined ||
                permission === 'read';

            const write =
                permission === undefined ||
                permission === 'write';

            if (
                !read &&
                !write
            ) {
                continue;
            }

            const existing =
                relays.get(
                    url
                );

            relays.set(
                url,
                {
                    url,
                    read:
                        read ||
                        existing?.read ===
                            true,
                    write:
                        write ||
                        existing?.write ===
                            true
                }
            );
        }

        return [
            ...relays.values()
        ];
    }

    ///////////////////////////////////////////////////////////////////////////

    private readLegacyRelayContent(
        content: string
    ): readonly NostrAccountRelay[] {

        try {
            const parsed =
                JSON.parse(
                    content
                ) as unknown;

            if (
                parsed === null ||
                typeof parsed !==
                    'object' ||
                Array.isArray(
                    parsed
                )
            ) {
                return [];
            }

            const relays:
                NostrAccountRelay[] =
                [];

            for (
                const [
                    url,
                    value
                ] of Object.entries(
                    parsed
                )
            ) {
                if (
                    !this.isRelayUrl(
                        url
                    ) ||
                    value === null ||
                    typeof value !==
                        'object' ||
                    Array.isArray(
                        value
                    )
                ) {
                    continue;
                }

                const relay =
                    value as {
                        read?: unknown;
                        write?: unknown;
                    };

                const read =
                    relay.read === true;

                const write =
                    relay.write === true;

                if (
                    !read &&
                    !write
                ) {
                    continue;
                }

                relays.push({
                    url,
                    read,
                    write
                });
            }

            return relays;
        } catch {
            return [];
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    private isRelayUrl(
        value: string | undefined
    ): value is string {

        if (
            value === undefined
        ) {
            return false;
        }

        try {
            const url =
                new URL(
                    value
                );

            return url.protocol ===
                'wss:' ||
                url.protocol ===
                    'ws:';
        } catch {
            return false;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    private setRelays(
        relays:
            readonly NostrAccountRelay[] |
            undefined
    ): void {

        this.relayProvider
            .setRelays(
                relays
            );
    }

    ///////////////////////////////////////////////////////////////////////////

    private addApplicationFollow(
        existing: SignedNostrEvent | null
    ): string[][] {

        const tags =
            existing?.tags
                .map((tag) =>
                    [...tag]
                ) ??
            [];

        const alreadyFollowing =
            tags.some(
                ([name, pubkey]) =>
                    name === 'p' &&
                    pubkey ===
                        this.applicationPubkey
            );

        if (
            !alreadyFollowing
        ) {
            tags.push([
                'p',
                this.applicationPubkey
            ]);
        }

        return tags;
    }
}
