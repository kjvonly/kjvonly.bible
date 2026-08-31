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
    DescriptorsRepresentationResolver
} from '$lib/resource/resolution/descriptors-representation-resolver';

import {
    BlossomResourceResolutionStrategy
} from '$lib/resource/resolution/blossom-resource-resolution-strategy';

import {
    ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import {
    ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import {
    ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import {
    ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import {
    ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
    JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
    GzipResourceContentDecorator
} from '$lib/resource/content/gzip-resource-content-decorator';

import {
    HexResourceContentDecorator
} from '$lib/resource/content/hex-resource-content-decorator';

import {
    ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import {
    IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

///////////////////////////////////////////////////////////////////////////////
// Resource

import {
    ResourceService
} from '$lib/resource/services/resource.service';

import {
    ResourceLoader
} from '$lib/resource/loading/resource-loader';

import {
    appendResourceReferenceBuilder
} from '$lib/resource/loading/resource-reference-builder';

import {
    ResourceSelectionService
} from '$lib/application/resources/resource-selection.service';

import type {
    PublishedResourceReference
} from '$lib/resource/models/resource.model';

// RESOURCE TYPES

import {
    BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
    STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

///////////////////////////////////////////////////////////////////////////////
// Bible

import {
    IndexedDBBibleChapterInstallationTransaction
} from '$lib/domains/bible/persistence/bible-chapter-installation-transaction';

import {
    BibleChapterInstaller
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
    BibleChapterInterpreter
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
    BibleChapterResourceHandler
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';

import {
    BibleChapterValidator
} from '$lib/domains/bible/resources/chapters/bible-chapter-validator';

import {
    IndexedDBChapterStore
} from '$lib/domains/bible/persistence/indexeddb-chapter-store';

import {
    ChapterService
} from '$lib/domains/bible/services/chapter.service';

import {
    BibleVersionsService
} from '$lib/domains/bible/services/bibleVersions.service';

import {
    IndexedDBBibleVersionCatalog
} from '$lib/domains/bible/persistence/indexeddb-bible-version-catalog';

import {
    VerseService
} from '$lib/domains/bible/services/verse.service';

import {
    KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
    getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
    BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import {
    createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

///////////////////////////////////////////////////////////////////////////////
// Strongs

import {
    IndexedDBStrongsInstallationTransaction
} from '$lib/domains/strongs/persistence/strongs-installation-transaction';

import {
    StrongsInstaller
} from '$lib/domains/strongs/resources/definitions/strongs-installer';

import {
    StrongsInterpreter
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
    StrongsValidator
} from '$lib/domains/strongs/resources/definitions/strongs-validator';

import {
    StrongsResourceHandler
} from '$lib/domains/strongs/resources/definitions/strongs-resource-handler';

import {
    IndexedDBStrongsStore
} from '$lib/domains/strongs/persistence/indexeddb-strongs-store';

import {
    StrongsService
} from '$lib/domains/strongs/services/strongs.service';

///////////////////////////////////////////////////////////////////////////////

import {
    LocalStorageResourceSelectionStore
} from '$lib/infrastructure/persistence/local-storage-resource-selection-store';

///////////////////////////////////////////////////////////////////////////////

const LOGIN_KEY =
    'login';

const NOSTR_STORAGE_PREFIX =
    `${import.meta.env.VITE_NOSTR_STORAGE_PREFIX}`;

const APPLICATION_BOOTSTRAP_RESOURCE:
    PublishedResourceReference = {
    publisher:
        KJVONLY_PUBKEY,

    resourceId:
        'kjvonly/resources/collections/default'
};

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

        ///////////////////////////////////////////////////////////////////////
        // Resource

        const resourceClient =
            createBrowserResourceClient(
                nostrSigner
            );

        const resourceDiscovery =
            new ResourceDiscovery(
                resourceClient
            );

        /*
         * The same decorator builder is used for:
         *
         * - normal Resource content decoding
         * - descriptor document decoding
         *
         * Descriptor retrieval strategies return raw
         * serialized bytes. They do not decode them.
         */
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

        /*
         * Resource receipts are shared by:
         *
         * - descriptor resolution for pre-download
         *   freshness checks
         *
         * - ResourceService for recording successful
         *   Resource processing
         */
        const resourceReceiptStore =
            new IndexedDBResourceReceiptStore(
                getApplicationDB
            );

        const resourceReceiptService =
            new ResourceReceiptService(
                resourceReceiptStore
            );

        const resourceDescriptorDocumentDecoder =
            new ResourceDescriptorDocumentDecoder(
                resourceContentDecoratorBuilder
            );

        const resourceDescriptorValidator =
            new ResourceDescriptorValidator();

        const blossomResourceResolutionStrategy =
            new BlossomResourceResolutionStrategy();

        const descriptorsRepresentationResolver =
            new DescriptorsRepresentationResolver(
                resourceDescriptorDocumentDecoder,
                resourceDescriptorValidator,
                resourceReceiptService,
                [
                    blossomResourceResolutionStrategy
                ]
            );

        const resourceResolver =
            new ResourceResolver([
                new ContentRepresentationResolver(),
                descriptorsRepresentationResolver
            ]);

        const resourceSelectionStore =
            new LocalStorageResourceSelectionStore(
                localStorage
            );

        const resourceSelectionService =
            new ResourceSelectionService(
                [
                    {
                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            `${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
                    },
                    {
                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            `${STRONGS_RESOURCE_TYPE}/kjvs`
                    }
                ],
                resourceSelectionStore
            );

        ///////////////////////////////////////////////////////////////////////
        // Bible Chapter

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

        const chapterStore =
            new IndexedDBChapterStore(
                getApplicationDB
            );

        const bibleVersionCatalog =
            new IndexedDBBibleVersionCatalog(
                getApplicationDB
            );

        const defaultBibleVersion:
            BibleVersion = {
            id:
                createBibleVersionId(
                    KJVONLY_PUBKEY,
                    'kjvs'
                ),

            publisher:
                KJVONLY_PUBKEY,

            version:
                'kjvs'
        };

        const bibleVersionsService =
            new BibleVersionsService(
                bibleVersionCatalog,
                defaultBibleVersion
            );

        ///////////////////////////////////////////////////////////////////////
        // Strongs

        const strongsInstallationTransaction =
            new IndexedDBStrongsInstallationTransaction(
                getApplicationDB
            );

        const strongsInstaller =
            new StrongsInstaller(
                strongsInstallationTransaction
            );

        const strongsResourceHandler =
            new StrongsResourceHandler(
                new StrongsInterpreter(),
                new StrongsValidator(),
                strongsInstaller
            );

        const strongsStore =
            new IndexedDBStrongsStore(
                getApplicationDB
            );

        ///////////////////////////////////////////////////////////////////////
        // Resource loaders and services

        const resourceService =
            new ResourceService(
                resourceDiscovery,
                resourceResolver,
                resourceContentDecoder,
                resourceReceiptService,
                [
                    bibleChapterResourceHandler,
                    strongsResourceHandler
                ]
            );

        // Chapter

        const chapterResourceLoader =
            new ResourceLoader<string>(
                resourceService,
                appendResourceReferenceBuilder
            );

        const chapterService =
            new ChapterService(
                chapterStore,
                chapterResourceLoader
            );

        const verseService =
            new VerseService(
                chapterService
            );

        // Strongs

        const strongsResourceLoader =
            new ResourceLoader(
                resourceService,
                appendResourceReferenceBuilder
            );

        const strongsService =
            new StrongsService(
                strongsStore,
                strongsResourceLoader
            );

        ///////////////////////////////////////////////////////////////////////
        // Application Context

        this.context = {
            nostrSigner,

            resourceClient,
            resourceDiscovery,
            resourceResolver,
            resourceContentDecoratorBuilder,
            resourceContentDecoder,

            resourceService,
            resourceSelectionService,

            chapterService,
            verseService,
            bibleVersionsService,

            strongsService
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
                .resourceSelectionService
                .restore();

            this.context
                .resourceClient
                .setDefaultRelays(
                    this.config
                        .resourceRelays
                );

            this.state =
                'started';

            /*
             * Bootstrap Resource installation is
             * application policy.
             *
             * It intentionally does not block
             * Application.start().
             *
             * The same ResourceService pipeline used
             * everywhere else performs discovery,
             * descriptor resolution, decoding, Domain
             * installation, and receipt persistence.
             */
            void this.installBootstrapResources();
        } catch (cause) {
            this.state =
                'created';

            this.startPromise =
                undefined;

            throw cause;
        }
    }

    private async installBootstrapResources():
        Promise<void> {

        try {
            const result =
                await this.context
                    .resourceService
                    .install(
                        APPLICATION_BOOTSTRAP_RESOURCE
                    );

            if (!result.found) {
                console.warn(
                    '[Application bootstrap Resource not found]',
                    APPLICATION_BOOTSTRAP_RESOURCE
                );

                return;
            }

            const incomplete =
                result.resources.filter(
                    (resource) =>
                        resource.status !==
                        'handled'
                );

            if (
                incomplete.length >
                0
            ) {
                console.warn(
                    '[Application bootstrap Resources incomplete]',
                    incomplete
                );
            }
        } catch (error) {
            console.warn(
                '[Application bootstrap Resource installation failed]',
                {
                    reference:
                        APPLICATION_BOOTSTRAP_RESOURCE,

                    error
                }
            );
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
            !login.startsWith(
                'nsec'
            )
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