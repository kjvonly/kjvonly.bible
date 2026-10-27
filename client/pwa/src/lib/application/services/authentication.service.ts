import type {
    AuthenticationResult,
    AuthenticationStrategy
} from './authentication/authentication-strategy';

import type {
    ExportableAuthenticationSecret
} from './authentication/exportable-authentication-secret';

import type {
    AuthenticationState,
    AuthenticationStateSubscriber
} from './authentication/authentication-state';

///////////////////////////////////////////////////////////////////////////////

export class AuthenticationService {

    private state:
        AuthenticationState = {
            status:
                'signed-out'
        };

    private userIdUnavailableReason:
        string |
        undefined =
        'Authentication has not been restored.';

    private readonly subscribers =
        new Set<
            AuthenticationStateSubscriber
        >();

    ///////////////////////////////////////////////////////////////////////////

    constructor(
        private readonly authenticationStrategy:
            AuthenticationStrategy
    ) { }

    ///////////////////////////////////////////////////////////////////////////

    getState():
        AuthenticationState {

        return this.state;
    }

    ///////////////////////////////////////////////////////////////////////////

    subscribe(
        subscriber:
            AuthenticationStateSubscriber
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

    tryGetExportableSecret():
        ExportableAuthenticationSecret |
        undefined {

        if (
            this.state.status !==
            'authenticated'
        ) {
            return undefined;
        }

        return this.authenticationStrategy
            .tryGetExportableSecret();
    }

    ///////////////////////////////////////////////////////////////////////////

    async createIdentity():
        Promise<void> {

        const result =
            await this.authenticationStrategy
                .createIdentity();

        this.setAuthentication(
            result
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    async tryLogin():
        Promise<boolean> {

        let result:
            Awaited<
                ReturnType<
                    AuthenticationStrategy['tryLogin']
                >
            >;

        try {
            result =
                await this.authenticationStrategy
                    .tryLogin();
        } catch {
            this.setSignedOut(
                'Saved login could not be restored.'
            );

            return false;
        }

        if (
            result ===
            null
        ) {
            this.setSignedOut(
                'No saved login is available.'
            );

            return false;
        }

        this.setAuthentication(
            result
        );

        return true;
    }

    ///////////////////////////////////////////////////////////////////////////

    async login(
        credentials: string
    ): Promise<void> {

        const result =
            await this.authenticationStrategy
                .login(
                    credentials
                );

        this.setAuthentication(
            result
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    tryGetUserId():
        string |
        undefined {

        try {
            return this.getUserId();
        } catch {
            return undefined;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    getUserId():
        string {

        if (
            this.state.status ===
            'signed-out'
        ) {
            throw new Error(
                this.userIdUnavailableReason ??
                'No authenticated user is available.'
            );
        }

        return this.state.userId;
    }

    ///////////////////////////////////////////////////////////////////////////

    private setAuthentication(
        authentication:
            AuthenticationResult
    ): void {

        this.userIdUnavailableReason =
            undefined;

        this.setState({
            status:
                authentication.status,
            userId:
                authentication.userId
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    private setSignedOut(
        reason: string
    ): void {

        this.userIdUnavailableReason =
            reason;

        this.setState({
            status:
                'signed-out'
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    private setState(
        state:
            AuthenticationState
    ): void {

        this.state =
            state;

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
