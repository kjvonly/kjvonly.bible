import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    AuthenticationResult,
    AuthenticationStrategy
} from './authentication/authentication-strategy';

import {
    AuthenticationService
} from './authentication.service';

///////////////////////////////////////////////////////////////////////////////

function createAuthenticationStrategy(
    result:
        AuthenticationResult |
        null
): AuthenticationStrategy {

    return {
        tryGetExportableSecret:
            vi.fn(
                () =>
                    undefined
            ),

        createIdentity:
            vi.fn(
                async () =>
                    result ?? {
                        status:
                            'authenticated',
                        userId:
                            'a'.repeat(64)
                    }
            ),

        tryLogin:
            vi.fn(
                async () =>
                    result
            ),

        login:
            vi.fn(
                async () =>
                    result ?? {
                        status:
                            'authenticated',
                        userId:
                            'a'.repeat(64)
                    }
            )
    };
}

///////////////////////////////////////////////////////////////////////////////

describe(
    'AuthenticationService',
    () => {
        it(
            'starts signed out before authentication restoration',
            () => {
                const service =
                    new AuthenticationService(
                        createAuthenticationStrategy(
                            null
                        )
                    );

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'signed-out'
                });
            }
        );

        it(
            'restores authenticated user state',
            async () => {
                const userId =
                    'b'.repeat(64);

                const strategy =
                    createAuthenticationStrategy({
                        status:
                            'authenticated',
                        userId
                    });

                const service =
                    new AuthenticationService(
                        strategy
                    );

                await expect(
                    service.tryLogin()
                ).resolves.toBe(true);

                expect(
                    strategy.tryLogin
                ).toHaveBeenCalledOnce();

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'authenticated',
                    userId
                });

                expect(
                    service.getUserId()
                ).toBe(userId);
            }
        );

        it(
            'restores read-only user state',
            async () => {
                const userId =
                    'c'.repeat(64);

                const service =
                    new AuthenticationService(
                        createAuthenticationStrategy({
                            status:
                                'read-only',
                            userId
                        })
                    );

                await expect(
                    service.tryLogin()
                ).resolves.toBe(true);

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'read-only',
                    userId
                });

                expect(
                    service.getUserId()
                ).toBe(userId);
            }
        );

        it(
            'publishes restored authentication state to subscribers',
            async () => {
                const userId =
                    'd'.repeat(64);

                const service =
                    new AuthenticationService(
                        createAuthenticationStrategy({
                            status:
                                'authenticated',
                            userId
                        })
                    );

                const subscriber =
                    vi.fn();

                service.subscribe(
                    subscriber
                );

                expect(
                    subscriber
                ).toHaveBeenNthCalledWith(
                    1,
                    {
                        status:
                            'signed-out'
                    }
                );

                await service
                    .tryLogin();

                expect(
                    subscriber
                ).toHaveBeenNthCalledWith(
                    2,
                    {
                        status:
                            'authenticated',
                        userId
                    }
                );
            }
        );

        it(
            'remains signed out when no saved login is available',
            async () => {
                const service =
                    new AuthenticationService(
                        createAuthenticationStrategy(
                            null
                        )
                    );

                await expect(
                    service.tryLogin()
                ).resolves.toBe(false);

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'signed-out'
                });

                expect(
                    () =>
                        service.getUserId()
                ).toThrow(
                    'No saved login is available.'
                );
            }
        );

        it(
            'remains signed out when saved login restoration fails',
            async () => {
                const strategy =
                    createAuthenticationStrategy(
                        null
                    );

                vi.mocked(
                    strategy.tryLogin
                ).mockRejectedValue(
                    new Error(
                        'login failed'
                    )
                );

                const service =
                    new AuthenticationService(
                        strategy
                    );

                await expect(
                    service.tryLogin()
                ).resolves.toBe(false);

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'signed-out'
                });

                expect(
                    () =>
                        service.getUserId()
                ).toThrow(
                    'Saved login could not be restored.'
                );
            }
        );

        it(
            'does not expose an exportable secret while signed out',
            () => {
                const strategy =
                    createAuthenticationStrategy(
                        null
                    );

                vi.mocked(
                    strategy.tryGetExportableSecret
                ).mockReturnValue({
                    type:
                        'nsec',
                    value:
                        'nsec1secret'
                });

                const service =
                    new AuthenticationService(
                        strategy
                    );

                expect(
                    service.tryGetExportableSecret()
                ).toBeUndefined();

                expect(
                    strategy.tryGetExportableSecret
                ).not.toHaveBeenCalled();
            }
        );

        it(
            'exposes the authenticated strategy exportable secret',
            async () => {
                const userId =
                    '9'.repeat(64);

                const strategy =
                    createAuthenticationStrategy({
                        status:
                            'authenticated',
                        userId
                    });

                const secret = {
                    type:
                        'nsec',
                    value:
                        'nsec1secret'
                };

                vi.mocked(
                    strategy.tryGetExportableSecret
                ).mockReturnValue(
                    secret
                );

                const service =
                    new AuthenticationService(
                        strategy
                    );

                await service.tryLogin();

                expect(
                    service.tryGetExportableSecret()
                ).toEqual(
                    secret
                );
            }
        );

        it(
            'creates an identity and publishes authenticated state',
            async () => {
                const userId =
                    'f'.repeat(64);

                const strategy =
                    createAuthenticationStrategy({
                        status:
                            'authenticated',
                        userId
                    });

                const service =
                    new AuthenticationService(
                        strategy
                    );

                await service
                    .createIdentity();

                expect(
                    strategy.createIdentity
                ).toHaveBeenCalledOnce();

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'authenticated',
                    userId
                });
            }
        );

        it(
            'logs in with credentials and publishes authenticated state',
            async () => {
                const userId =
                    'e'.repeat(64);

                const strategy =
                    createAuthenticationStrategy({
                        status:
                            'authenticated',
                        userId
                    });

                const service =
                    new AuthenticationService(
                        strategy
                    );

                const subscriber =
                    vi.fn();

                service.subscribe(
                    subscriber
                );

                await service
                    .login(
                        'credentials'
                    );

                expect(
                    strategy.login
                ).toHaveBeenCalledWith(
                    'credentials'
                );

                expect(
                    service.getState()
                ).toEqual({
                    status:
                        'authenticated',
                    userId
                });

                expect(
                    subscriber
                ).toHaveBeenLastCalledWith({
                    status:
                        'authenticated',
                    userId
                });
            }
        );

        it(
            'returns undefined when the current user id is unavailable',
            () => {
                const service =
                    new AuthenticationService(
                        createAuthenticationStrategy(
                            null
                        )
                    );

                expect(
                    service.tryGetUserId()
                ).toBeUndefined();
            }
        );
    }
);
