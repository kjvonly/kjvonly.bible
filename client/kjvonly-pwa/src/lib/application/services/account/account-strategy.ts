import type {
    AccountState
} from './account-state';

///////////////////////////////////////////////////////////////////////////////

export type AccountSetup = {
    readonly userId: string;
    readonly name: string;
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
}
