import type {
    ExportableAuthenticationSecret
} from './exportable-authentication-secret';

export type AuthenticationResult = {
    readonly status:
        'authenticated' |
        'read-only';
    readonly userId:
        string;
};

///////////////////////////////////////////////////////////////////////////////

export interface AuthenticationStrategy {

    tryGetExportableSecret():
        ExportableAuthenticationSecret |
        undefined;

    createIdentity():
        Promise<AuthenticationResult>;

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
