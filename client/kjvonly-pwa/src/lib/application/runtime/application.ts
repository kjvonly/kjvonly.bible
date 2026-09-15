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
    NostrAuthenticationStrategy
} from '$lib/infrastructure/nostr/authentication/nostr-authentication-strategy';

import {
    createBrowserNostrClient
} from '$lib/infrastructure/nostr/client/create-nostr-client';

import {
    ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import {
    NostrResourceResolutionStrategy
} from '$lib/resource/resolution/nostr-resource-resolution-strategy';

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

import {
    ModuleResourceSelectionBuilder
} from '$lib/application/resources/module-resource-selection-builder';

import {
    BibleModuleResourceSelectionContributor
} from '$lib/domains/bible/resources/bible-module-resource-selection-contributor';

import {
    SearchModuleResourceSelectionContributor
} from '$lib/domains/bible/resources/search/search-module-resource-selection-contributor';

import {
    StrongsModuleResourceSelectionContributor
} from '$lib/domains/strongs/resources/strongs-module-resource-selection-contributor';

import {
    NotesModuleResourceSelectionContributor
} from '$lib/domains/notes/resources/notes-module-resource-selection-contributor';

import {
    PlansModuleResourceSelectionContributor
} from '$lib/domains/reading-plans/resources/plans-module-resource-selection-contributor';

import {
    NoResourceModuleResourceSelectionContributor
} from '$lib/application/resources/no-resource-module-resource-selection-contributor';

import {
    Modules
} from '$lib/application/models/modules.model';

import {
    ModuleBufferFactory
} from '$lib/application/runtime/buffer/module-buffer-factory';

import {
    createModuleResourceSelectionResolver
} from '$lib/application/resources/module-resource-selection-resolver';

import {
    paneService
} from '$lib/application/services/pane.service.svelte';

import type {
    PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
    ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
    AuthenticationService
} from '$lib/application/services/authentication.service';

import {
    AccountService
} from '$lib/application/services/account/account.service';

import {
    NostrAccountStrategy
} from '$lib/infrastructure/nostr/account/nostr-account-strategy';

import {
    NostrAccountRelayProvider
} from '$lib/infrastructure/nostr/account/nostr-account-relay-provider';

import {
    IndexedDBNostrEventsStore
} from '$lib/infrastructure/nostr/events/persistence/indexeddb-nostr-events-store';

import {
    IndexedDBNostrEventWriteTransaction
} from '$lib/infrastructure/nostr/events/persistence/nostr-event-write-transaction';

import {
    NostrEventPublication
} from '$lib/infrastructure/nostr/events/publication/nostr-event-publication';

import {
    NostrEventPublicationStrategy
} from '$lib/infrastructure/nostr/events/publication/nostr-event-publication-strategy';

import {
    NostrEventsService
} from '$lib/infrastructure/nostr/events/services/nostr-events.service';

import {
    IndexedDBOutboxStore
} from '$lib/application/outbox/indexeddb-outbox-store';

import {
    OutboxProcessor
} from '$lib/application/outbox/outbox-processor';

import {
    NostrResourcePublicationStrategy
} from '$lib/resource/nostr/nostr-resource-publication-strategy';

import {
    ResourceContentEncoder
} from '$lib/resource/content/resource-content-encoder';

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

///////////////////////////////////////////////////////////////////////////////
// Resource Types

import {
    BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
    STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import { BIBLE_PARAGRAPHS_RESOURCE_TYPE } from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-interpreter';

import { BIBLE_PERICOPES_RESOURCE_TYPE } from '$lib/domains/bible/resources/pericopes/bible-pericopes-interpreter';

import { BIBLE_SEARCH_RESOURCE_TYPE } from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

///////////////////////////////////////////////////////////////////////////////
// Bible

import {
    IndexedDBChapterStore
} from '$lib/domains/bible/persistence/indexeddb-chapter-store';

import {
    ChapterService
} from '$lib/domains/bible/services/chapter.service';

import {
    IndexedDBBibleParagraphsStore
} from '$lib/domains/bible/persistence/indexeddb-bible-paragraphs-store';

import {
    ParagraphsService
} from '$lib/domains/bible/services/paragraphs.service';

import {
    IndexedDBBiblePericopesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-pericopes-store';

import {
    PericopesService
} from '$lib/domains/bible/services/pericopes.service';

import {
    IndexedDBBibleTextMarkupStore
} from '$lib/domains/bible/persistence/indexeddb-bible-text-markup-store';

import {
    IndexedDBBibleTextMarkupWriteTransaction
} from '$lib/domains/bible/persistence/bible-text-markup-write-transaction';

import {
    BibleTextMarkupService
} from '$lib/domains/bible/services/bible-text-markup.service';

import {
    BibleTextMarkupResourcePublication
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-publication';

import {
    IndexedDBBibleBooknamesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-booknames-store';

import {
    BibleBooknamesService
} from '$lib/domains/bible/services/bible-booknames.service';

import {
    IndexedDBBibleSearchIndexStore
} from '$lib/domains/bible/persistence/indexeddb-bible-search-index-store';

import {
    BibleSearchIndexService
} from '$lib/domains/bible/services/bible-search-index.service';

import {
    createSearchService
} from '$lib/domains/bible/services/search.service';

import {
    SearchRuntime
} from '$lib/domains/bible/runtime/search/search-runtime';

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
// Notes

import {
    IndexedDBNotesStore
} from '$lib/domains/notes/persistence/indexeddb-notes-store';

import {
    IndexedDBNotesWriteTransaction
} from '$lib/domains/notes/persistence/notes-write-transaction';

import {
    NotesResourcePublication
} from '$lib/domains/notes/resources/notes-resource-publication';

import {
    NotesService
} from '$lib/domains/notes/services/notes.service';

///////////////////////////////////////////////////////////////////////////////
// Reading Plans

import {
    IndexedDBPlanDefinitionsStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-definitions-store';

import {
    PlanDefinitionsService
} from '$lib/domains/reading-plans/services/plan-definitions.service';

import {
    IndexedDBPlanSubscriptionsStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-subscriptions-store';

import {
    IndexedDBPlanSubscriptionWriteTransaction
} from '$lib/domains/reading-plans/persistence/plan-subscription-write-transaction';

import {
    PlanSubscriptionResourcePublication
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-resource-publication';

import {
    PlanSubscriptionsService
} from '$lib/domains/reading-plans/services/plan-subscriptions.service';

import {
    IndexedDBPlanProgressStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-progress-store';

import {
    IndexedDBPlanProgressWriteTransaction
} from '$lib/domains/reading-plans/persistence/plan-progress-write-transaction';

import {
    PlanProgressResourcePublication
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-publication';

import {
    PlanProgressService
} from '$lib/domains/reading-plans/services/plan-progress.service';

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

    private readonly nostrSigner:
        NostrSigner;

    private readonly resourceWorkerClient:
        ResourceWorkerClient;

    private readonly outboxProcessor:
        OutboxProcessor;

    constructor(
        private readonly config:
            ApplicationConfig
    ) {

        ///////////////////////////////////////////////////////////////////////
        // Nostr

        const nostrSigner =
            new NostrSigner();

        this.nostrSigner =
            nostrSigner;

        const nostrAuthenticationStrategy =
            new NostrAuthenticationStrategy(
                localStorage,
                nostrSigner,
                {
                    onNip46Auth:
                        (url) => {
                            window.open(
                                url,
                                '_blank'
                            );
                        }
                }
            );

        ///////////////////////////////////////////////////////////////////////
        // Authentication

        const authenticationService =
            new AuthenticationService(
                nostrAuthenticationStrategy
            );

        const nostrClient =
            createBrowserNostrClient(
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
                nostrClient
            );

        ///////////////////////////////////////////////////////////////////////
        // Outbox

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

        const resourceContentEncoder =
            new ResourceContentEncoder(
                resourceContentDecoratorBuilder
            );

        const resourcePublicationStrategy =
            new NostrResourcePublicationStrategy(
                nostrClient,
                resourceContentEncoder
            );

        const outboxStore =
            new IndexedDBOutboxStore(
                getApplicationDB
            );

        const nostrEventPublicationStrategy =
            new NostrEventPublicationStrategy(
                nostrClient
            );

        const outboxProcessor =
            new OutboxProcessor(
                outboxStore,
                [
                    resourcePublicationStrategy,
                    nostrEventPublicationStrategy
                ]
            );

        this.outboxProcessor =
            outboxProcessor;

        ///////////////////////////////////////////////////////////////////////
        // Nostr Events

        const nostrEventsStore =
            new IndexedDBNostrEventsStore(
                getApplicationDB
            );

        const nostrEventWriteTransaction =
            new IndexedDBNostrEventWriteTransaction(
                getApplicationDB
            );

        const nostrEventPublication =
            new NostrEventPublication();

        const nostrEventsService =
            new NostrEventsService(
                nostrEventsStore,
                nostrEventWriteTransaction,
                nostrEventPublication,
                outboxProcessor
            );

        ///////////////////////////////////////////////////////////////////////
        // Account

        const nostrAccountRelayProvider =
            new NostrAccountRelayProvider();

        const nostrAccountStrategy =
            new NostrAccountStrategy(
                nostrClient,
                nostrEventsService,
                nostrAccountRelayProvider,
                this.config
                    .accountBootstrapRelays,
                KJVONLY_PUBKEY
            );

        const accountService =
            new AccountService(
                nostrAccountStrategy
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
                resourceDiscovery,
                [
                    new NostrResourceResolutionStrategy(
                        nostrClient
                    )
                ]
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
                            `${BIBLE_BOOKNAMES_RESOURCE_TYPE}/default`
                    },
                    {
                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            `${BIBLE_PARAGRAPHS_RESOURCE_TYPE}/default`
                    },
                    {
                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            `${BIBLE_PERICOPES_RESOURCE_TYPE}/default`
                    },
                    {
                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            `${BIBLE_SEARCH_RESOURCE_TYPE}/kjvs`
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

        const moduleResourceSelectionBuilder =
            new ModuleResourceSelectionBuilder(
                resourceSelectionService,
                [
                    new BibleModuleResourceSelectionContributor(
                        authenticationService
                    ),
                    new SearchModuleResourceSelectionContributor(),
                    new StrongsModuleResourceSelectionContributor(),
                    new NotesModuleResourceSelectionContributor(
                        authenticationService
                    ),
                    new PlansModuleResourceSelectionContributor(
                        authenticationService
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.MODULES
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.USER_GUIDE
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.LOGIN
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.SETTINGS
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.NULL
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.PROFILE
                    )
                ]
            );

        const moduleBufferFactory =
            new ModuleBufferFactory(
                moduleResourceSelectionBuilder
            );

        const moduleResourceSelectionResolver =
            createModuleResourceSelectionResolver(
                paneService
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

        const paragraphsStore =
            new IndexedDBBibleParagraphsStore(
                getApplicationDB
            );

        const paragraphsResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const paragraphsService =
            new ParagraphsService(
                paragraphsStore,
                paragraphsResourceLoader
            );

        const pericopesStore =
            new IndexedDBBiblePericopesStore(
                getApplicationDB
            );

        const pericopesResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const pericopesService =
            new PericopesService(
                pericopesStore,
                pericopesResourceLoader
            );

        const bibleTextMarkupStore =
            new IndexedDBBibleTextMarkupStore(
                getApplicationDB
            );

        const bibleTextMarkupResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const bibleTextMarkupWriteTransaction =
            new IndexedDBBibleTextMarkupWriteTransaction(
                getApplicationDB
            );

        const bibleTextMarkupResourcePublication =
            new BibleTextMarkupResourcePublication();

        const bibleTextMarkupService =
            new BibleTextMarkupService(
                bibleTextMarkupStore,
                bibleTextMarkupResourceLoader,
                bibleTextMarkupWriteTransaction,
                bibleTextMarkupResourcePublication,
                outboxProcessor
            );

        const bibleBooknamesStore =
            new IndexedDBBibleBooknamesStore(
                getApplicationDB
            );

        const bibleBooknamesService =
            new BibleBooknamesService(
                bibleBooknamesStore,
                resourceWorkerClient
            );

        const bibleSearchIndexStore =
            new IndexedDBBibleSearchIndexStore(
                getApplicationDB
            );

        const bibleSearchIndexService =
            new BibleSearchIndexService(
                bibleSearchIndexStore,
                resourceWorkerClient
            );

        const searchRuntime =
            new SearchRuntime(
                bibleSearchIndexService
            );

        const searchService =
            createSearchService(
                searchRuntime
            );

        const verseService =
            new VerseService(
                chapterService
            );

        ///////////////////////////////////////////////////////////////////////
        // Notes

        const notesStore =
            new IndexedDBNotesStore(
                getApplicationDB
            );

        const notesWriteTransaction =
            new IndexedDBNotesWriteTransaction(
                getApplicationDB
            );

        const notesResourcePublication =
            new NotesResourcePublication();

        const notesService =
            new NotesService(
                notesStore,
                notesWriteTransaction,
                notesResourcePublication,
                outboxProcessor
            );

        ///////////////////////////////////////////////////////////////////////
        // Reading Plans

        const planDefinitionsStore =
            new IndexedDBPlanDefinitionsStore(
                getApplicationDB
            );

        const planDefinitionsService =
            new PlanDefinitionsService(
                planDefinitionsStore
            );

        const planSubscriptionsStore =
            new IndexedDBPlanSubscriptionsStore(
                getApplicationDB
            );

        const planSubscriptionWriteTransaction =
            new IndexedDBPlanSubscriptionWriteTransaction(
                getApplicationDB
            );

        const planSubscriptionResourcePublication =
            new PlanSubscriptionResourcePublication();

        const planSubscriptionsService =
            new PlanSubscriptionsService(
                planSubscriptionsStore,
                planSubscriptionWriteTransaction,
                planSubscriptionResourcePublication,
                outboxProcessor
            );

        const planProgressStore =
            new IndexedDBPlanProgressStore(
                getApplicationDB
            );

        const planProgressWriteTransaction =
            new IndexedDBPlanProgressWriteTransaction(
                getApplicationDB
            );

        const planProgressResourcePublication =
            new PlanProgressResourcePublication();

        const planProgressService =
            new PlanProgressService(
                planProgressStore,
                planProgressWriteTransaction,
                planProgressResourcePublication,
                outboxProcessor
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
            authenticationService,
            accountService,

            nostrClient,
            nostrAccountStrategy,
            resourceDiscovery,

            resourceService:
                resourceWorkerClient,

            resourceSelectionService,
            moduleBufferFactory,
            moduleResourceSelectionResolver,

            chapterService,
            paragraphsService,
            pericopesService,
            bibleTextMarkupService,
            bibleBooknamesService,
            searchService,
            verseService,
            bibleVersionsService,

            notesService,

            planDefinitionsService,
            planSubscriptionsService,
            planProgressService,

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
         * another discovery request while NostrClient
         * infrastructure is being torn down.
         */
        this.resourceWorkerClient
            .dispose();

        this.context
            .nostrClient
            .dispose();

        await this.nostrSigner
            .clear();

        this.state =
            'stopped';
    }

    ///////////////////////////////////////////////////////////////////////////

    private async startInternal():
        Promise<void> {

        try {
            this.context
                .resourceSelectionService
                .restore();

            this.context
                .nostrClient
                .setDefaultRelays(
                    this.config
                        .resourceRelays
                );

            const userId =
                this.context
                    .authenticationService
                    .tryGetUserId();

            if (
                userId !==
                undefined
            ) {
                await this.context
                    .accountService
                    .load(
                        userId
                    );

                void this.context
                    .accountService
                    .refresh(
                        userId
                    )
                    .catch(
                        (error) => {
                            console.warn(
                                '[Account refresh failed]',
                                error
                            );
                        }
                    );
            }

            /*
             * Pending application publications are durable.
             * Startup only needs to wake the Outbox after
             * signing and relay configuration are ready.
             */
            this.outboxProcessor
                .wake();

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

        const multipleResourceTypes =
            new Set<string>();

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
             * ResourceInstallResult contains terminal
             * Resources after recursive descriptor
             * processing. A nested collection may therefore
             * install multiple distinct Resources of the
             * same Resource Type.
             *
             * Such a type cannot initialize one global
             * Resource selection. Leave that selection to
             * module/domain policy while preserving all
             * unambiguous bootstrap selections.
             */
            if (
                multipleResourceTypes.has(
                    resourceType
                )
            ) {
                continue;
            }

            const existing =
                selections.get(
                    resourceType
                );

            if (
                existing !==
                undefined
            ) {
                if (
                    existing.publisher ===
                        reference.publisher &&
                    existing.resourceId ===
                        reference.resourceId
                ) {
                    continue;
                }

                selections.delete(
                    resourceType
                );

                multipleResourceTypes.add(
                    resourceType
                );

                continue;
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

}
