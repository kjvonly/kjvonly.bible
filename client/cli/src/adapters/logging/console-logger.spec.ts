import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    ConsoleLogger
} from './console-logger.js';


describe(
    'ConsoleLogger',
    () => {

        afterEach(
            () => {

                vi.restoreAllMocks();
            }
        );


        it(
            'does not log verbose events when disabled',
            () => {

                const consoleLog =
                    vi.spyOn(
                        console,
                        'log'
                    ).mockImplementation(
                        () => { }
                    );


                const logger =
                    new ConsoleLogger(
                        false
                    );


                logger.verbose(
                    'manifest.load.start',
                    {
                        path:
                            'manifest.yaml'
                    }
                );


                expect(
                    consoleLog
                ).not.toHaveBeenCalled();
            }
        );


        it(
            'logs verbose events when enabled',
            () => {

                const consoleLog =
                    vi.spyOn(
                        console,
                        'log'
                    ).mockImplementation(
                        () => { }
                    );


                const logger =
                    new ConsoleLogger(
                        true
                    );


                logger.verbose(
                    'manifest.load.start',
                    {
                        path:
                            'manifest.yaml'
                    }
                );


                expect(
                    consoleLog
                ).toHaveBeenCalledWith(
                    '[verbose] manifest.load.start',
                    {
                        path:
                            'manifest.yaml'
                    }
                );
            }
        );


        it(
            'logs events without context',
            () => {

                const consoleLog =
                    vi.spyOn(
                        console,
                        'log'
                    ).mockImplementation(
                        () => { }
                    );


                const logger =
                    new ConsoleLogger(
                        true
                    );


                logger.verbose(
                    'sync.build.start'
                );


                expect(
                    consoleLog
                ).toHaveBeenCalledWith(
                    '[verbose] sync.build.start'
                );
            }
        );
        it(
            'can enable verbose logging after construction',
            () => {

                const consoleLog =
                    vi.spyOn(
                        console,
                        'log'
                    ).mockImplementation(
                        () => { }
                    );


                const logger =
                    new ConsoleLogger(
                        false
                    );


                logger.setVerboseEnabled(
                    true
                );


                logger.verbose(
                    'sync.build.start'
                );


                expect(
                    consoleLog
                ).toHaveBeenCalledWith(
                    '[verbose] sync.build.start'
                );
            }
        );
    }
);