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

///////////////////////////////////////////////////////////////////////////////
// Resource

import {
    createBrowserResourceWorkerClient,
    type ResourceWorkerClient
} from '$lib/resource/worker/resource-worker-client';

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

import type {
    ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

///////////////////////////////////////////////////////////////////////////////
// Resource Types

import {
    BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
    STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

///////////////////////////////////////////////////////////////////////////////
// Bible

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
// Strong's

import {
    IndexedDBStrongsStore
} from '$lib/domains/strongs/persistence/indexeddb-strongs-store';

import {
    StrongsService
} from '$lib/domains/strongs/services/strongs.service';

///////////////////////////////////////////////////////////////////////////////
// Persistence

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

///////////////////////////////////////////////////////////////////////////////

type ApplicationState =
    | 'created'
    | 'starting'
    | 'started'
    | 'stopped';

///////////////////////////////////////////////////////////////////////////////

export class Application {

    readonly context:
        ApplicationContext;

    private state:
        ApplicationState =
        'created';

    private startPromise:
        Promise<void> |
        undefined;

    private readonly resourceWorkerClient:
        ResourceWorkerClient;

    constructor(
        private readonly config:
            ApplicationConfig
    ) {

        ///////////////////////////////////////////////////////////////////////
        // Nostr

        const nostrSigner =
            new NostrSigner();

        const resourceClient =
            createBrowserResourceClient(
                nostrSigner
            );

        /*
         * Nostr Resource discovery remains on the
         * application/main thread.
         *
         * ResourceDiscovery converts transport-specific
         * Nostr events into ResourceRepresentation values.
         *
         * Everything after that boundary executes through
         * the Resource Worker.
         */
        const resourceDiscovery =
            new ResourceDiscovery(
                resourceClient
            );

        ///////////////////////////////////////////////////////////////////////
        // Resource Worker

        /*
         * The Resource Worker owns Resource processing:
         *
         * ResourceService
         *     ↓
         * Resource Resolution
         *     ↓
         * descriptor processing
         *     ↓
         * external retrieval / integrity verification
         *     ↓
         * Resource content decoding
         *     ↓
         * ResourceHandler dispatch
         *     ↓
         * Domain interpretation / validation
         *     ↓
         * Domain installation
         *     ↓
         * Resource receipt persistence
         *
         * Resource discovery is bridged back to the
         * main-thread ResourceDiscovery above.
         */
        const resourceWorkerClient =
            createBrowserResourceWorkerClient(
                resourceDiscovery
            );

        this.resourceWorkerClient =
            resourceWorkerClient;

        ///////////////////////////////////////////////////////////////////////
        // Resource Selection

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
        // Bible

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

        /*
         * ResourceLoader only depends on the generic
         * install(reference) capability.
         *
         * Resource acquisition therefore executes through
         * ResourceWorkerClient rather than a main-thread
         * ResourceService.
         */
        const chapterResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
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

        ///////////////////////////////////////////////////////////////////////
        // Strong's

        const strongsStore =
            new IndexedDBStrongsStore(
                getApplicationDB
            );

        const strongsResourceLoader =
            new ResourceLoader(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const strongsService =
            new StrongsService(
                strongsStore,
                strongsResourceLoader
            );

        ///////////////////////////////////////////////////////////////////////
        // Application Context

        /*
         * Only application-facing capabilities are exposed.
         *
         * Resource resolution, decoding, handlers,
         * installation transactions, receipt persistence,
         * and ResourceService composition now live inside
         * resource.worker.ts.
         */
        this.context = {
            nostrSigner,

            resourceClient,
            resourceDiscovery,

            resourceService:
                resourceWorkerClient,

            resourceSelectionService,

            chapterService,
            verseService,
            bibleVersionsService,

            strongsService
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    start():
        Promise<void> {

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

    ///////////////////////////////////////////////////////////////////////////

    async stop():
        Promise<void> {

        if (
            this.state ===
            'stopped'
        ) {
            return;
        }

        /*
         * Stop Resource processing before disposing
         * main-thread discovery transport.
         *
         * This prevents the Resource Worker from issuing
         * another discovery request while ResourceClient
         * infrastructure is being torn down.
         */
        this.resourceWorkerClient
            .dispose();

        this.context
            .resourceClient
            .dispose();

        await this.context
            .nostrSigner
            .clear();

        this.state =
            'stopped';
    }

    ///////////////////////////////////////////////////////////////////////////

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

            /*
             * The application is interactive before
             * bootstrap Resource processing begins.
             */
            this.state =
                'started';

            /*
             * Bootstrap Resource installation is
             * application policy.
             *
             * It intentionally does not block
             * Application.start().
             *
             * Resource processing executes in the
             * Resource Worker.
             *
             * Nostr discovery remains on the main thread
             * and returns ResourceRepresentation across
             * the worker bridge.
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

    ///////////////////////////////////////////////////////////////////////////

    private async installBootstrapResources():
        Promise<void> {

        try {
            const result =
                await this.resourceWorkerClient
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

            try {
                this.initializeBootstrapResourceSelections(
                    result
                );
            } catch (error) {
                console.warn(
                    '[Application bootstrap Resource selection initialization failed]',
                    {
                        reference:
                            APPLICATION_BOOTSTRAP_RESOURCE,

                        error
                    }
                );
            }

            const incomplete =
                result.resources.filter(
                    (resource) =>
                        resource.status !==
                        'handled' &&
                        resource.status !==
                        'current'
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

    ///////////////////////////////////////////////////////////////////////////

    private initializeBootstrapResourceSelections(
        result:
            ResourceInstallResult
    ): void {

        const selections =
            new Map<
                string,
                PublishedResourceReference
            >();

        for (
            const resource of
            result.resources
        ) {
            const reference =
                resource.reference;

            const resourceType =
                resource.resourceType;

            /*
             * A failure can occur before a child
             * descriptor has trustworthy Resource
             * identity.
             */
            if (
                reference ===
                    undefined ||
                resourceType ===
                    undefined
            ) {
                continue;
            }

            /*
             * A collection-level resolution failure may
             * identify the requested bootstrap Resource
             * itself. The collection is not one of its
             * selectable child Resources.
             */
            if (
                reference.publisher ===
                    result.requested.publisher &&
                reference.resourceId ===
                    result.requested.resourceId
            ) {
                continue;
            }

            /*
             * Generic descriptor collections may contain
             * multiple Resources of the same Resource
             * Type, but the application-default collection
             * may contain at most one default per type.
             */
            if (
                selections.has(
                    resourceType
                )
            ) {
                throw new Error(
                    `Duplicate application bootstrap Resource Type: ${resourceType}`
                );
            }

            selections.set(
                resourceType,
                {
                    ...reference
                }
            );
        }

        this.context
            .resourceSelectionService
            .initializeMissing(
                [
                    ...selections.values()
                ]
            );
    }

    ///////////////////////////////////////////////////////////////////////////

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