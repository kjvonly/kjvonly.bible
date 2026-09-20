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

import type {
    NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import {
    ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import {
    NostrResourceResolutionStrategy
} from '$lib/resource/resolution/nostr-resource-resolution-strategy';

///////////////////////////////////////////////////////////////////////////////
// Resource

import {
	ResourceLoader,
	appendResourceReferenceBuilder,
	createBrowserResourceWorkerClient,
	ResourceContentDecoratorBuilder,
	JsonResourceContentDecorator,
	GzipResourceContentDecorator,
	HexResourceContentDecorator,
	ResourceContentEncoder,
	type PublishedResourceReference,
	type ResourceInstallResult,
	type ResourceWorkerClient
} from '$lib/resource';


import {
    KJVOnlyArchiveService
} from '$lib/application/archive/kjvonly-archive.service';

import {
    createBrowserKJVOnlyArchiveWorkerClient
} from '$lib/application/archive/worker/kjvonly-archive-worker-client';

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
} from '$lib/domains/strongs';

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
    PaneService
} from '$lib/application/services/pane.service.svelte';

import {
    WorkspaceRuntime
} from '$lib/application/runtime/workspace/workspace-runtime';


import {
    AuthenticationService
} from '$lib/application/services/authentication.service';

import {
    AccountService
} from '$lib/application/services/account/account.service';

import {
    ToastService
} from '$lib/application/services/toast.service';

import {
    SettingsService
} from '$lib/application/services/settings.service';

import {
    NavigationServiceFactory
} from '$lib/application/services/navigation-service-factory';

import {
    NostrAccountStrategy
} from '$lib/infrastructure/nostr/account/nostr-account-strategy';

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

///////////////////////////////////////////////////////////////////////////////
// Resource Types

import {
    BIBLE_CHAPTER_RESOURCE_TYPE,
    BIBLE_BOOKNAMES_RESOURCE_TYPE,
    BIBLE_PARAGRAPHS_RESOURCE_TYPE,
    BIBLE_PERICOPES_RESOURCE_TYPE,
    BIBLE_SEARCH_RESOURCE_TYPE,
    ChapterService,
    ParagraphsService,
    PericopesService,
    BibleTextMarkupService,
    BibleBooknamesService,
    createSearchService,
    BibleVersionsService,
    VerseService,
    BookGroupingsService,
    BibleLocationReferenceService,
    BibleNavigationService,
    createBibleVersionId,
    type BibleVersion
} from '$lib/domains/bible';


import {
    STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs';


///////////////////////////////////////////////////////////////////////////////
// Bible

import {
    IndexedDBChapterStore
} from '$lib/domains/bible/persistence/indexeddb-chapter-store';


import {
    IndexedDBBibleParagraphsStore
} from '$lib/domains/bible/persistence/indexeddb-bible-paragraphs-store';


import {
    IndexedDBBiblePericopesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-pericopes-store';


import {
    IndexedDBBibleTextMarkupStore
} from '$lib/domains/bible/persistence/indexeddb-bible-text-markup-store';

import {
    IndexedDBBibleTextMarkupWriteTransaction
} from '$lib/domains/bible/persistence/bible-text-markup-write-transaction';


import {
    BibleTextMarkupResourcePublication
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-resource-publication';

import {
    IndexedDBBibleBooknamesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-booknames-store';


import {
    IndexedDBBibleSearchIndexStore
} from '$lib/domains/bible/persistence/indexeddb-bible-search-index-store';

import {
    BibleSearchIndexService
} from '$lib/domains/bible/services/bible-search-index.service';


import {
    SearchRuntime
} from '$lib/domains/bible/runtime/search/search-runtime';


import {
    IndexedDBBibleVersionCatalog
} from '$lib/domains/bible/persistence/indexeddb-bible-version-catalog';


import {
    KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
    getApplicationDB
} from '$lib/infrastructure/persistence/application.db';


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
    NOTES_RESOURCE_TYPE,
    NotesService
} from '$lib/domains/notes';

///////////////////////////////////////////////////////////////////////////////
// Reading Plans

import {
    IndexedDBPlanDefinitionsStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-definitions-store';

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
    IndexedDBPlanProgressStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-progress-store';

import {
    IndexedDBPlanProgressWriteTransaction
} from '$lib/domains/reading-plans/persistence/plan-progress-write-transaction';

import {
    PlanProgressResourcePublication
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-publication';

import {
    PlanDefinitionsService,
    PlanSubscriptionsService,
    PlanProgressService,
    PlansPubSubService,
    SubsEnricherService,
    EncodedReadingsDecoderService,
    createPlansWorker,
    PLAN_SUBSCRIPTION_RESOURCE_TYPE,
    PLAN_PROGRESS_RESOURCE_TYPE
} from '$lib/domains/reading-plans';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import {
    IndexedDBStrongsStore
} from '$lib/domains/strongs/persistence/indexeddb-strongs-store';

import {
    StrongsService
} from '$lib/domains/strongs';

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

    private readonly nostrClient:
        NostrClient;

    private readonly resourceWorkerClient:
        ResourceWorkerClient;

    private readonly resourceSelectionService:
        ResourceSelectionService;

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

        this.nostrClient =
            nostrClient;

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

        const nostrAccountStrategy =
            new NostrAccountStrategy(
                nostrClient,
                nostrEventsService,
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

        this.resourceSelectionService =
            resourceSelectionService;

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
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.ARCHIVE
                    )
                ]
            );

        const moduleBufferFactory =
            new ModuleBufferFactory(
                moduleResourceSelectionBuilder
            );

        const paneService =
            new PaneService(
                localStorage
            );

        const workspaceRuntime =
            new WorkspaceRuntime(
                paneService,
                moduleBufferFactory
            );

        const toastService =
            new ToastService();

        const settingsService =
            new SettingsService();

        const navigationServiceFactory =
            new NavigationServiceFactory();

        const archiveService =
            new KJVOnlyArchiveService(
                createBrowserKJVOnlyArchiveWorkerClient()
            );

        const moduleResourceSelectionResolver =
            createModuleResourceSelectionResolver(
                workspaceRuntime
            );

        ///////////////////////////////////////////////////////////////////////
        // Bible

        const bookGroupingsService =
            new BookGroupingsService();

        const bibleLocationReferenceService =
            new BibleLocationReferenceService();

        const bibleNavigationService =
            new BibleNavigationService(
                bibleLocationReferenceService
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
                chapterResourceLoader,
                bibleLocationReferenceService
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
                paragraphsResourceLoader,
                bibleLocationReferenceService
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
                pericopesResourceLoader,
                bibleLocationReferenceService
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
                outboxProcessor,
                bibleLocationReferenceService
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

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        BIBLE_SEARCH_RESOURCE_TYPE
                    )
                ) {
                    void searchRuntime.refresh();
                }
            }
        );

        const verseService =
            new VerseService(
                chapterService,
                bibleLocationReferenceService
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

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        NOTES_RESOURCE_TYPE
                    )
                ) {
                    notesService.refresh();
                }
            }
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

        const plansPubSubService =
            new PlansPubSubService(
                createPlansWorker()
            );

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        PLAN_SUBSCRIPTION_RESOURCE_TYPE
                    ) ||
                    importedResourceTypes.has(
                        PLAN_PROGRESS_RESOURCE_TYPE
                    )
                ) {
                    plansPubSubService.refresh();
                }
            }
        );

        const subsEnricherService =
            new SubsEnricherService();

        const encodedReadingsDecoderService =
            new EncodedReadingsDecoderService();

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
            toastService,
            settingsService,
            navigationServiceFactory,
            archiveService,

            workspaceRuntime,
            moduleResourceSelectionResolver,

            chapterService,
            paragraphsService,
            pericopesService,
            bibleTextMarkupService,
            bibleBooknamesService,
            searchService,
            verseService,
            bibleVersionsService,
            bookGroupingsService,
            bibleLocationReferenceService,
            bibleNavigationService,

            notesService,

            planDefinitionsService,
            planSubscriptionsService,
            planProgressService,
            plansPubSubService,
            subsEnricherService,
            encodedReadingsDecoderService,

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

        this.nostrClient
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
                .settingsService
                .applySettings();

            this.resourceSelectionService
                .restore();

            this.context
                .workspaceRuntime
                .initialize(
                    Modules.BIBLE
                );

            this.nostrClient
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

        this.resourceSelectionService
            .initializeMissing(
                [
                    ...selections.values()
                ]
            );
    }

}
