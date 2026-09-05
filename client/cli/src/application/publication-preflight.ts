import type {
    Manifest
} from '../domain/manifest.js';

import type {
    PublicationEndpointPreflight
} from '../ports/publication-endpoint-preflight.js';

export interface PreflightCheck {
    readonly type:
    string;

    readonly data:
    unknown;

    readonly preflight:
    PublicationEndpointPreflight;
}

export class PublicationPreflight {

    constructor(
        private readonly nostr:
            PublicationEndpointPreflight,

        private readonly blossom:
            PublicationEndpointPreflight
    ) { }


    async check(
        manifest:
            Manifest
    ): Promise<void> {

        let checks = [];

        checks.push({
            type:
                'nostr',

            data:
                manifest.nostr,

            preflight:
                this.nostr
        });

        for (
            const strategy
            of Object.values(
                manifest.strategies
            )
        ) {
            switch (
            strategy.type
            ) {
                case 'blossom':
                    checks.push({
                        type:
                            'blossom',

                        data:
                            strategy,

                        preflight:
                            this.blossom
                    });

                    break;
            }
        }

        const results =
            await Promise.allSettled(
                checks.map(
                    check =>
                        check
                            .preflight
                            .check(
                                check.data
                            )
                )
            );


        const failures =
            results.flatMap(
                (
                    result,
                    index
                ) => {

                    if (
                        result.status ===
                        'fulfilled'
                    ) {
                        return [];
                    }


                    const check =
                        checks[
                        index
                        ]!;


                    return [
                        `${check.type} ${check.data}: ${result.reason instanceof Error
                            ? result.reason.message
                            : String(
                                result.reason
                            )
                        }`
                    ];
                }
            );


        if (
            failures.length >
            0
        ) {
            throw new Error(
                [
                    'Publication preflight failed:',
                    ...failures
                ].join(
                    '\n'
                )
            );
        }
    }
}