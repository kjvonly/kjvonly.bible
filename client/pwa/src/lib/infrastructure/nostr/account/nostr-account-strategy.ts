import type {
    Event as SignedNostrEvent
} from 'nostr-typedef';

import type {
    AccountRelay,
    AccountSetup,
    AccountState,
    AccountUpdate,
    AccountStrategy
} from '$lib/application';

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

        private readonly bootstrapRelays:
            readonly NostrRelay[],

        private readonly applicationPubkey:
            string
    ) { }

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

        return this.createAccountState(
            metadata,
            this.readRelayPreferences(
                relayList,
                contacts
            )
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
            account.userId,
            this.bootstrapRelays
        );

        await this.putContacts(
            account.userId,
            existingContacts
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async update(
        account: AccountUpdate
    ): Promise<void> {

        await this.assertSignerIdentity(
            account.userId
        );

        this.assertAccountUpdate(
            account
        );

        await this.putMetadata(
            account
        );

        await this.putRelayList(
            account.userId,
            account.relays
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

    private assertAccountUpdate(
        account: AccountUpdate
    ): void {

        if (
            account.name.trim() ===
            ''
        ) {
            throw new Error(
                'Account name is required.'
            );
        }

        const urls =
            new Set<string>();

        for (
            const relay
            of account.relays
        ) {
            if (
                !this.isRelayUrl(
                    relay.url
                )
            ) {
                throw new Error(
                    `Invalid account relay: ${relay.url}`
                );
            }

            if (
                !relay.read &&
                !relay.write
            ) {
                throw new Error(
                    `Account relay must be readable or writable: ${relay.url}`
                );
            }

            if (
                urls.has(
                    relay.url
                )
            ) {
                throw new Error(
                    `Duplicate account relay: ${relay.url}`
                );
            }

            urls.add(
                relay.url
            );
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    private async putMetadata(
        account:
            AccountSetup |
            AccountUpdate
    ): Promise<void> {

        const existing =
            await this.events
                .getByKindAndPubkey(
                    0,
                    account.userId
                );

        const profile =
            this.readProfile(
                existing
            );

        await this.events.put(
            this.createEvent(
                account.userId,
                0,
                JSON.stringify({
                    ...profile,
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
        userId: string,
        relays:
            readonly AccountRelay[]
    ): Promise<void> {

        await this.events.put(
            this.createEvent(
                userId,
                10002,
                '',
                relays
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
            undefined,
        relays:
            readonly AccountRelay[] |
            undefined
    ): AccountState {

        const name =
            this.readName(
                metadata
            );

        return {
            ...(
                name === undefined
                    ? {}
                    : { name }
            ),
            ...(
                relays === undefined
                    ? {}
                    : { relays }
            )
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    private readProfile(
        metadata:
            Pick<
                NostrEvent,
                'content'
            > |
            SignedNostrEvent |
            undefined
    ): Record<string, unknown> {

        if (
            metadata ===
            undefined
        ) {
            return {};
        }

        try {
            const profile =
                JSON.parse(
                    metadata.content
                ) as unknown;

            if (
                profile === null ||
                typeof profile !==
                    'object' ||
                Array.isArray(
                    profile
                )
            ) {
                return {};
            }

            return profile as
                Record<string, unknown>;
        } catch {
            return {};
        }
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

        const profile =
            this.readProfile(
                metadata
            );

        return typeof profile.name ===
            'string'
            ? profile.name
            : typeof profile.display_name ===
                'string'
                ? profile.display_name
                : undefined;
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
    ): readonly AccountRelay[] |
        undefined {

        if (
            relayList !== undefined
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
    ): readonly AccountRelay[] {

        const relays =
            new Map<
                string,
                AccountRelay
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
    ): readonly AccountRelay[] {

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
                AccountRelay[] =
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
