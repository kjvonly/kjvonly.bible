export type NostrAccountRelay = {
    readonly url: string;
    readonly read: boolean;
    readonly write: boolean;
};

export type NostrAccountRelaySubscriber =
    (
        relays:
            readonly NostrAccountRelay[]
    ) => void;

export class NostrAccountRelayProvider {

    private relays:
        readonly NostrAccountRelay[] =
            [];

    private readonly subscribers =
        new Set<
            NostrAccountRelaySubscriber
        >();

    ///////////////////////////////////////////////////////////////////////////

    getRelays():
        readonly NostrAccountRelay[] {

        return this.relays;
    }

    ///////////////////////////////////////////////////////////////////////////

    subscribe(
        subscriber:
            NostrAccountRelaySubscriber
    ): () => void {

        this.subscribers.add(
            subscriber
        );

        subscriber(
            this.relays
        );

        return () => {
            this.subscribers.delete(
                subscriber
            );
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    setRelays(
        relays:
            readonly NostrAccountRelay[] |
            undefined
    ): void {

        this.relays =
            relays ?? [];

        for (
            const subscriber
            of this.subscribers
        ) {
            subscriber(
                this.relays
            );
        }
    }
}
