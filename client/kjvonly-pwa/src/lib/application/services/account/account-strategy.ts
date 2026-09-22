import type {
    AccountRelay,
    AccountState
} from './account-state';

///////////////////////////////////////////////////////////////////////////////

export type AccountSetup = {
    readonly userId: string;
    readonly name: string;
};

///////////////////////////////////////////////////////////////////////////////

export type AccountUpdate = {
    readonly userId: string;
    readonly name: string;
    readonly relays:
        readonly AccountRelay[];
};

///////////////////////////////////////////////////////////////////////////////

export interface AccountStrategy {

    load(
        userId: string
    ): Promise<AccountState>;

    refresh(
        userId: string
    ): Promise<AccountState>;

    setup(
        account: AccountSetup
    ): Promise<void>;

    update(
        account: AccountUpdate
    ): Promise<void>;
}
