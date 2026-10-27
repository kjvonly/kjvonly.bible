import type {
    AccountRelay,
    AccountState,
    AccountStateSubscriber
} from './account-state';

import type {
    AccountStrategy
} from './account-strategy';

///////////////////////////////////////////////////////////////////////////////

export class AccountService {

    private state:
        AccountState = {};

    private readonly subscribers =
        new Set<
            AccountStateSubscriber
        >();

    ///////////////////////////////////////////////////////////////////////////

    constructor(
        private readonly accountStrategy:
            AccountStrategy
    ) { }

    ///////////////////////////////////////////////////////////////////////////

    getState():
        AccountState {

        return this.state;
    }

    ///////////////////////////////////////////////////////////////////////////

    subscribe(
        subscriber:
            AccountStateSubscriber
    ): () => void {

        this.subscribers.add(
            subscriber
        );

        subscriber(
            this.state
        );

        return () => {
            this.subscribers.delete(
                subscriber
            );
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    async load(
        userId: string
    ): Promise<void> {

        this.setState(
            await this.accountStrategy
                .load(
                    userId
                )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async refresh(
        userId: string
    ): Promise<void> {

        this.setState(
            await this.accountStrategy
                .refresh(
                    userId
                )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async setup(
        userId: string,
        name: string
    ): Promise<void> {

        await this.accountStrategy
            .setup({
                userId,
                name
            });

        this.setState(
            await this.accountStrategy
                .load(
                    userId
                )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async update(
        userId: string,
        name: string,
        relays:
            readonly AccountRelay[]
    ): Promise<void> {

        await this.accountStrategy
            .update({
                userId,
                name,
                relays
            });

        this.setState(
            await this.accountStrategy
                .load(
                    userId
                )
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    private setState(
        state: AccountState
    ): void {

        this.state = state;

        for (
            const subscriber
            of this.subscribers
        ) {
            subscriber(
                this.state
            );
        }
    }
}
