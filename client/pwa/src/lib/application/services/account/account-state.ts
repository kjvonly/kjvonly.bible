export type AccountRelay = {
    readonly url: string;
    readonly read: boolean;
    readonly write: boolean;
};

export type AccountState = {
    readonly name?: string;
    readonly relays?:
        readonly AccountRelay[];
};

export type AccountStateSubscriber =
    (state: AccountState) => void;
