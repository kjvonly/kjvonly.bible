import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    AccountService
} from './account.service';

import type {
    AccountStrategy
} from './account-strategy';

///////////////////////////////////////////////////////////////////////////////

function createStrategy(
    overrides: Partial<AccountStrategy> = {}
): AccountStrategy {
    return {
        load:
            vi.fn()
                .mockResolvedValue({}),
        refresh:
            vi.fn()
                .mockResolvedValue({}),
        setup:
            vi.fn()
                .mockResolvedValue(
                    undefined
                ),
        ...overrides
    };
}

///////////////////////////////////////////////////////////////////////////////

describe(
    'AccountService',
    () => {
        it(
            'loads cached account state through the configured strategy',
            async () => {
                const load =
                    vi.fn()
                        .mockResolvedValue({
                            name:
                                'Cached Name'
                        });

                const service =
                    new AccountService(
                        createStrategy({
                            load
                        })
                    );

                await service.load(
                    'user-id'
                );

                expect(load)
                    .toHaveBeenCalledWith(
                        'user-id'
                    );

                expect(
                    service.getState()
                ).toEqual({
                    name:
                        'Cached Name'
                });
            }
        );

        it(
            'publishes refreshed account state through subscribers',
            async () => {
                const service =
                    new AccountService(
                        createStrategy({
                            refresh:
                                vi.fn()
                                    .mockResolvedValue({
                                        name:
                                            'Fresh Name',
                                        relays: [
                                            {
                                                url:
                                                    'wss://relay.example',
                                                read: true,
                                                write: false
                                            }
                                        ]
                                    })
                        })
                    );

                const states:
                    unknown[] = [];

                const unsubscribe =
                    service.subscribe(
                        (state) => {
                            states.push(
                                state
                            );
                        }
                    );

                await service.refresh(
                    'user-id'
                );

                unsubscribe();

                expect(states)
                    .toEqual([
                        {},
                        {
                            name:
                                'Fresh Name',
                            relays: [
                                {
                                    url:
                                        'wss://relay.example',
                                    read: true,
                                    write: false
                                }
                            ]
                        }
                    ]);
            }
        );

        it(
            'delegates account setup to the configured strategy',
            async () => {
                const setup =
                    vi.fn()
                        .mockResolvedValue(
                            undefined
                        );

                const service =
                    new AccountService(
                        createStrategy({
                            setup
                        })
                    );

                await service.setup(
                    'user-id',
                    'Stephen'
                );

                expect(setup)
                    .toHaveBeenCalledWith({
                        userId:
                            'user-id',
                        name:
                            'Stephen'
                    });
            }
        );

        it(
            'publishes locally persisted account state after setup succeeds',
            async () => {
                const load =
                    vi.fn()
                        .mockResolvedValue({
                            name:
                                'Stephen'
                        });

                const service =
                    new AccountService(
                        createStrategy({
                            load
                        })
                    );

                const states:
                    unknown[] = [];

                const unsubscribe =
                    service.subscribe(
                        (state) => {
                            states.push(
                                state
                            );
                        }
                    );

                await service.setup(
                    'user-id',
                    'Stephen'
                );

                unsubscribe();

                expect(load)
                    .toHaveBeenCalledWith(
                        'user-id'
                    );

                expect(states)
                    .toEqual([
                        {},
                        {
                            name:
                                'Stephen'
                        }
                    ]);
            }
        );
    }
);
