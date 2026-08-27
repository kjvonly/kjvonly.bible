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

import {
    GzipResourceContentDecorator
} from '$lib/resource/content/gzip-resource-content-decorator';

import {
    HexResourceContentDecorator
} from '$lib/resource/content/hex-resource-content-decorator';

import { IndexedDBBibleChapterInstallationTransaction } from '$lib/domains/bible/persistence/bible-chapter-installation-transaction';
import { BibleChapterInstaller } from '$lib/domains/bible/resources/chapters/bible-chapter-installer';
import { BibleChapterInterpreter } from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';
import { BibleChapterResourceHandler } from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';
import { BibleChapterValidator } from '$lib/domains/bible/resources/chapters/bible-chapter-validator';
import { BibleChapterResourceService } from '$lib/domains/bible/resources/chapters/bible-chapter-resource-service';
import { IndexedDBChapterStore } from '$lib/domains/bible/persistence/indexeddb-chapter-store';
import { ChapterService } from '$lib/domains/bible/services/chapter.service';
import { BibleVersionsService } from '$lib/domains/bible/services/bibleVersions.service';
import { IndexedDBBibleVersionCatalog } from '$lib/domains/bible/persistence/indexeddb-bible-version-catalog';
import { VerseService } from '$lib/domains/bible/services/verse.service';
import { BibleChapterResourceLoader } from '$lib/domains/bible/resources/chapters/bible-chapter-resource-loader';
import { KJVONLY_PUBKEY } from '$lib/infrastructure/nostr/nostr';
import {
    getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const LOGIN_KEY =
    'login';

const NOSTR_STORAGE_PREFIX =
    `${import.meta.env.VITE_NOSTR_STORAGE_PREFIX}`;

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
                },
                {
                    token:
                        'gzip',

                    decorate:
                        (inner) =>
                            new GzipResourceContentDecorator(
                                inner
                            )
                },
                {
                    token:
                        'hex',

                    decorate:
                        (inner) =>
                            new HexResourceContentDecorator(
                                inner
                            )
                }
            ]);

        const resourceContentDecoder =
            new ResourceContentDecoder(
                resourceContentDecoratorBuilder
            );

        const bibleChapterInstallationTransaction =
            new IndexedDBBibleChapterInstallationTransaction(
               getApplicationDB 
            );

        const bibleChapterInstaller =
            new BibleChapterInstaller(
                bibleChapterInstallationTransaction
            );

        const bibleChapterResourceHandler =
            new BibleChapterResourceHandler(
                new BibleChapterInterpreter(),
                new BibleChapterValidator(),
                bibleChapterInstaller
            );

        const bibleChapterResourceService =
            new BibleChapterResourceService(
                resourceDiscovery,
                resourceResolver,
                resourceContentDecoder,
                bibleChapterResourceHandler
            );

        const chapterStore =
            new IndexedDBChapterStore(
                getApplicationDB
            );

        const chapterResourceLoader =
            new BibleChapterResourceLoader(
                bibleChapterResourceService
            );

        const chapterService =
            new ChapterService(
                KJVONLY_PUBKEY,
                chapterStore,
                chapterResourceLoader
            );
        const verseService =
            new VerseService(
                chapterService
            );

        const bibleVersionCatalog =
            new IndexedDBBibleVersionCatalog(
               getApplicationDB 
            );

        const bibleVersionsService =
            new BibleVersionsService(
                bibleVersionCatalog
            );

        this.context = {
            nostrSigner,
            resourceClient,
            resourceDiscovery,
            resourceResolver,
            resourceContentDecoratorBuilder,
            resourceContentDecoder,
            bibleChapterResourceService,
            chapterService,
            verseService,
            bibleVersionsService
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
            await this.restoreNsec();

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

    private async restoreNsec():
        Promise<void> {
        const login =
            localStorage.getItem(
                `${NOSTR_STORAGE_PREFIX}:${LOGIN_KEY}`
            );

        if (
            !login ||
            !login.startsWith('nsec')
        ) {
            return;
        }

        await this.context
            .nostrSigner
            .useNsec(
                login
            );
    }
}