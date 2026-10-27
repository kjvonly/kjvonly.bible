export type AuthenticationState =
    | {
        readonly status:
            'signed-out';
    }
    | {
        readonly status:
            'authenticated' |
            'read-only';
        readonly userId:
            string;
    };

///////////////////////////////////////////////////////////////////////////////

export type AuthenticationStateSubscriber =
    (
        state:
            AuthenticationState
    ) => void;
