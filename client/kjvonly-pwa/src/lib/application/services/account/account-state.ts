export type AccountState = {
    readonly name?: string;
};

export type AccountStateSubscriber =
    (state: AccountState) => void;
