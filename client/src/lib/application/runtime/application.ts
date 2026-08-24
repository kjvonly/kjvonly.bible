import type {
    ApplicationContext
} from './application-context';

import type {
    ApplicationConfig
} from '$lib/application/config/application.config';

import {
    NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
    createBrowserResourceClient
} from '$lib/infrastructure/nostr/resource-client';

import {
    ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import {
    ContentRepresentationResolver
} from '$lib/resource/resolution/content-representation-resolver';

import {
    ResourceResolver
} from '$lib/resource/resolution/resource-resolver';
import { ResourceContentDecoder } from '$lib/resource/content/resource-content-decoder';
import { ResourceContentDecoratorBuilder } from '$lib/resource/content/resource-content-decorator-builder';
import { JsonResourceContentDecorator } from '$lib/resource/content/json-resource-content-decorator';

type ApplicationState =
    | 'created'
    | 'starting'
    | 'started'
    | 'stopped';

export class Application {
    readonly context:
        ApplicationContext;

    private state:
        ApplicationState =
        'created';

    private startPromise:
        Promise<void> |
        undefined;

    constructor(
        private readonly config:
            ApplicationConfig
    ) {
        const nostrSigner =
            new NostrSigner();

        const resourceClient =
            createBrowserResourceClient(
                nostrSigner
            );

        const resourceDiscovery =
            new ResourceDiscovery(
                resourceClient
            );

        const resourceResolver =
            new ResourceResolver([
                new ContentRepresentationResolver()
            ]);

        const resourceContentDecoratorBuilder =
            new ResourceContentDecoratorBuilder([
                {
                    token:
                        'application/json',

                    decorate:
                        (inner) =>
                            new JsonResourceContentDecorator(
                                inner
                            )
                }
            ]);

        const resourceContentDecoder =
            new ResourceContentDecoder(
                resourceContentDecoratorBuilder
            );

        this.context = {
            nostrSigner,
            resourceClient,
            resourceDiscovery,
            resourceResolver,
            resourceContentDecoratorBuilder,
            resourceContentDecoder
        };
    }

    start(): Promise<void> {
        if (
            this.state ===
            'started'
        ) {
            return Promise.resolve();
        }

        if (
            this.state ===
            'stopped'
        ) {
            return Promise.reject(
                new Error(
                    'Application has already been stopped.'
                )
            );
        }

        if (
            this.startPromise !==
            undefined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting';

        this.startPromise =
            this.startInternal();

        return this.startPromise;
    }

    async stop(): Promise<void> {
        if (
            this.state ===
            'stopped'
        ) {
            return;
        }

        this.context
            .resourceClient
            .dispose();

        await this.context
            .nostrSigner
            .clear();

        this.state =
            'stopped';
    }

    private async startInternal():
        Promise<void> {

        try {
            this.context
                .resourceClient
                .setDefaultRelays(
                    this.config
                        .resourceRelays
                );

            /*
             * Future startup sequencing
             * belongs here:
             *
             * 1. initialize persistence
             * 2. restore authentication
             * 3. initialize Domain services
             * 4. initialize Workspace Runtime
             * 5. become interactive
             * 6. begin background work
             */

            this.state =
                'started';
        } catch (cause) {
            this.state =
                'created';

            this.startPromise =
                undefined;

            throw cause;
        }
    }
}