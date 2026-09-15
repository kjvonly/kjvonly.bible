export type AuthenticationResult = {
    readonly status:
        'authenticated' |
        'read-only';
    readonly userId:
        string;
};

///////////////////////////////////////////////////////////////////////////////

export interface AuthenticationStrategy {

    tryLogin():
        Promise<
            AuthenticationResult |
            null
        >;

    login(
        credentials: string
    ): Promise<
        AuthenticationResult
    >;
}
