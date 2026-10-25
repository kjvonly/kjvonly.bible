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
	ResourceDescriptorValidator,
	appendResourceReferenceBuilder,
	ResourceContentDecoratorBuilder,
	JsonResourceContentDecorator,
	GzipResourceContentDecorator,
	HexResourceContentDecorator,
	ResourceContentEncoder,
	type PublishedResourceReference,
	type ResourceInstallResult
} from '$lib/resource';

import {
	createBrowserResourceWorkerClient,
	type ResourceWorkerClient
} from '$lib/resource/worker';


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
    plansNavigationViewRegistrations
} from '$lib/domains/reading-plans/ui';

import {
    notesNavigationViewRegistrations
} from '$lib/domains/notes/ui';

import { bookmarksNavigationViewRegistrations } from '$lib/domains/bookmarks/ui';
import { DictionaryRuntime, dictionaryNavigationViewRegistrations } from '$lib/domains/dictionary/ui';
import { BOOKMARKS_VIEWS, BookmarksModuleResourceSelectionContributor } from '$lib/domains/bookmarks';

import {
    DictionaryModuleResourceSelectionContributor,
    DictionaryInstallationService,
    DictionaryPublishedIndexPreparer,
    createDictionaryService,
    DICTIONARY_VIEWS,
    createDictionaryResourceId,
    DICTIONARY_RESOURCE_TYPE,
    type DictionaryEditionSource
} from '$lib/domains/dictionary';

import {
    IndexedDBDictionaryHeadwordSourceStore
} from '$lib/domains/dictionary/persistence/indexeddb-dictionary-headword-source-store';

import {
    bibleNavigationViewRegistrations,
    refsNavigationViewRegistrations,
    searchNavigationViewRegistrations
} from '$lib/domains/bible/ui';

import {
    NoResourceModuleResourceSelectionContributor
} from '$lib/application/resources/no-resource-module-resource-selection-contributor';

import {
    modulesNavigationViewRegistrations
} from '$lib/application/modules/modules/modules-navigation-view-registrations';

import {
    archiveNavigationViewRegistrations
} from '$lib/application/modules/archive/archive-navigation-view-registrations';

import {
    profileNavigationViewRegistrations
} from '$lib/application/modules/profile/profile-navigation-view-registrations';

import {
    loginNavigationViewRegistrations
} from '$lib/application/modules/login/login-navigation-view-registrations';

import {
    settingsNavigationViewRegistrations
} from '$lib/application/modules/settings/settings-navigation-view-registrations';

import {
    fileManagerNavigationViewRegistrations
} from '$lib/application/modules/file-manager/file-manager-navigation-view-registrations';

import {
    ModuleLaunchDestinationResolver
} from '../modules/modules/module-launch-destination-resolver';

import {
    ApplicationReferenceResolver
} from '../references/application-reference-resolver';

import {    ResourceModuleResolver
}  from '../modules/modules/resource-module-resolver';

import {
    ARCHIVE_VIEWS
} from '../modules/archive/archive-navigation.model';

import {
    PROFILE_VIEWS
} from '../modules/profile/profile-navigation.model';

import {
    SETTINGS_VIEWS
} from '../modules/settings/models/settings-navigation.model';

import {
    FILE_MANAGER_VIEWS
} from '../modules/file-manager/models/file-manager-navigation.model';

import {
    MODULES_VIEWS
} from '$lib/application/modules/modules/modules-navigation.model';

import {
    LOGIN_VIEWS
} from '$lib/application/modules/login/login-navigation.model';

import {
    Modules
} from '$lib/application/models/modules.model';


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
    PaneNavigationSplitter
} from '$lib/application/runtime/pane/pane-navigation-splitter';


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
    PetNameService
} from '$lib/application/services/pet-name.service';

import {
    NavigationStateBuilder
} from '$lib/application/services/navigation-state-builder';

import {
    NavigationRuntimeFactory
} from '$lib/application/runtime/navigation/navigation-runtime-factory';

import {
    NavigationViewRegistry
} from '$lib/application/runtime/rendering/navigation-view-registry';

import {
    NavigationViewResolver
} from '$lib/application/runtime/rendering/navigation-view-resolver';

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
    BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
    createBibleChapterResourceId,
    createBibleBooknamesResourceId,
    createBibleParagraphsResourceId,
    createBiblePericopesResourceId,
    createBibleSearchIndexResourceId,
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
    BibleVerseReferenceService,
    BIBLE_LOCATION_REFERENCE_TYPE,
    parseBibleLocationRef,
    BIBLE_VIEWS,
    SEARCH_VIEWS,
    createBibleVersionId,
    type BibleVersion
} from '$lib/domains/bible';



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
// Filesystem

import {
    FilesystemService
} from '$lib/domains/filesystem';

import {
    IndexedDBFilesystemStore
} from '$lib/domains/filesystem/persistence/indexeddb-filesystem-store';

import {
    FilesystemSearchRuntime
} from '$lib/domains/filesystem/runtime/search/filesystem-search-runtime';

///////////////////////////////////////////////////////////////////////////////
// Development

import {
    createApplicationBootstrapMode,
    type ApplicationBootstrapMode
} from './dev/application-bootstrap-mode';

import {
    createFilesystemRuntimeMode,
    type FilesystemRuntimeMode
} from './dev/filesystem-runtime-mode';

import {
    MockFilesystemRuntime
} from './dev/mock-filesystem-runtime';

import {
    createFilesystemBootstrapMode,
    type FilesystemBootstrapMode
} from './filesystem-bootstrap-mode';

///////////////////////////////////////////////////////////////////////////////
// Normalized Content

import {
    NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
    normalizedContentResourceModuleRegistrations,
    NormalizedContentService,
    NormalizedContentTextMarkupResourcePublication,
    NormalizedContentTextMarkupService
} from '$lib/domains/normalized-content';

import {
    normalizedContentNavigationViewRegistrations
} from '$lib/domains/normalized-content/ui';

import {
    IndexedDBNormalizedContentStore
} from '$lib/domains/normalized-content/persistence/indexeddb-normalized-content-store';

import {
    IndexedDBNormalizedContentTextMarkupStore
} from '$lib/domains/normalized-content/persistence/indexeddb-normalized-content-text-markup-store';

import {
    IndexedDBNormalizedContentTextMarkupWriteTransaction
} from '$lib/domains/normalized-content/persistence/normalized-content-text-markup-write-transaction';

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
    NotesSearchRuntime
} from '$lib/domains/notes/runtime/search/notes-search-runtime';

import {
    NOTES_RESOURCE_TYPE,
    NOTES_VIEWS,
    NotesAvailabilityService,
    NotesService
} from '$lib/domains/notes';

///////////////////////////////////////////////////////////////////////////////
// Bookmarks

import {
    BOOKMARKS_RESOURCE_TYPE,
    BookmarksResourcePublication,
    BookmarksService
} from '$lib/domains/bookmarks';

import {
    IndexedDBBookmarksStore
} from '$lib/domains/bookmarks/persistence/indexeddb-bookmarks-store';

import {
    IndexedDBBookmarksWriteTransaction
} from '$lib/domains/bookmarks/persistence/bookmarks-write-transaction';

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
    PLAN_PROGRESS_RESOURCE_TYPE,
    PLANS_VIEWS
} from '$lib/domains/reading-plans';

///////////////////////////////////////////////////////////////////////////////
// Strong's



import {
    StrongsService
} from '$lib/domains/strongs';

///////////////////////////////////////////////////////////////////////////////
// Persistence

import {
    LocalStorageResourceSelectionStore
} from '$lib/infrastructure/persistence/local-storage-resource-selection-store';

///////////////////////////////////////////////////////////////////////////////

/**
 * Published Resource collection installed by the normal application bootstrap.
 *
 * Production always retains this bootstrap policy. Development may disable it
 * only through the dedicated development override for focused workflows.
 */
const APPLICATION_BOOTSTRAP_RESOURCE:
    PublishedResourceReference = {

    publisher:
        KJVONLY_PUBKEY,

    resourceId:
        'kjvonly/resources/collections/default'
};

/**
 * Published Filesystem Resource installed when the Filesystem bootstrap
 * release feature is enabled.
 *
 * The configured Resource is the durable application-owned Filesystem mount,
 * published separately from the ordinary application bootstrap collection.
 */
const FILESYSTEM_BOOTSTRAP_RESOURCE:
    PublishedResourceReference = {

    publisher:
        KJVONLY_PUBKEY,

    resourceId:
        'kjvonly/filesystem/app-filesystem'
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Webster 1828 is the initial Dictionary Resource selection. All editions are
 * prepared only when a Dictionary view first opens, never during app bootstrap.
 * The selected Resource remains owned by the pane's navigation entry.
 */
const DEFAULT_DICTIONARY_RESOURCE = createDictionaryResourceId('webster-1828');
const STRONGS_DICTIONARY_SOURCE: DictionaryEditionSource = {
    publisher: KJVONLY_PUBKEY,
    resourceId: createDictionaryResourceId('strongs-kjvs')
};
const DICTIONARY_EDITIONS_ON_OPEN: readonly DictionaryEditionSource[] = [
    { publisher: KJVONLY_PUBKEY, resourceId: DEFAULT_DICTIONARY_RESOURCE },
    { publisher: KJVONLY_PUBKEY, resourceId: createDictionaryResourceId('webster-1844') },
    STRONGS_DICTIONARY_SOURCE
];

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

    private readonly applicationBootstrapMode:
        ApplicationBootstrapMode =
        createApplicationBootstrapMode();

    private readonly filesystemRuntimeMode:
        FilesystemRuntimeMode =
        createFilesystemRuntimeMode();

    private readonly filesystemBootstrapMode:
        FilesystemBootstrapMode =
        createFilesystemBootstrapMode();

    private authenticationBootstrapUnsubscribe:
        (() => void) |
        undefined;

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

        const petNameService =
            new PetNameService(
                localStorage,
                {
                    [KJVONLY_PUBKEY]:
                        'KJVOnly'
                }
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
                        resourceType:
                            BIBLE_CHAPTER_RESOURCE_TYPE,

                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            createBibleChapterResourceId(
                                'kjvs'
                            )
                    },
                    {
                        resourceType:
                            BIBLE_BOOKNAMES_RESOURCE_TYPE,

                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            createBibleBooknamesResourceId(
                                'default'
                            )
                    },
                    {
                        resourceType:
                            BIBLE_PARAGRAPHS_RESOURCE_TYPE,

                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            createBibleParagraphsResourceId(
                                'default'
                            )
                    },
                    {
                        resourceType:
                            BIBLE_PERICOPES_RESOURCE_TYPE,

                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            createBiblePericopesResourceId(
                                'default'
                            )
                    },
                    {
                        resourceType:
                            BIBLE_SEARCH_RESOURCE_TYPE,

                        publisher:
                            KJVONLY_PUBKEY,

                        resourceId:
                            createBibleSearchIndexResourceId(
                                'kjvs'
                            )
                    },
                    {
                        resourceType: DICTIONARY_RESOURCE_TYPE,
                        publisher: KJVONLY_PUBKEY,
                        resourceId: DEFAULT_DICTIONARY_RESOURCE
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
                    new StrongsModuleResourceSelectionContributor(STRONGS_DICTIONARY_SOURCE),
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
                    ),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.NORMALIZED_CONTENT
                    ),
                    new BookmarksModuleResourceSelectionContributor(),
                    new DictionaryModuleResourceSelectionContributor(),
                    new NoResourceModuleResourceSelectionContributor(
                        Modules.FILE_MANAGER
                    ),
 

                ]
            );

        const paneService =
            new PaneService(
                localStorage
            );

        const workspaceRuntime =
            new WorkspaceRuntime(
                paneService
            );

        const toastService =
            new ToastService();

        const settingsService =
            new SettingsService();

        const resourceModuleResolver =
            new ResourceModuleResolver(
                normalizedContentResourceModuleRegistrations
            );

        const moduleLaunchDestinationResolver =
            new ModuleLaunchDestinationResolver([
                {
                    module:
                        Modules.PLANS,
                    view:
                        PLANS_VIEWS.SUBS_LIST,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.BIBLE,
                    view:
                        BIBLE_VIEWS.READER,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.SEARCH,
                    view:
                        SEARCH_VIEWS.RESULTS,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.NOTES,
                    view:
                        NOTES_VIEWS.ROOT,
                    createState:
                        () => ({})
                },
                {
                    module: Modules.BOOKMARKS,
                    view: BOOKMARKS_VIEWS.ROOT,
                    createState: () => ({})
                },
                {
                    module: Modules.DICTIONARY,
                    view: DICTIONARY_VIEWS.ROOT,
                    createState: () => ({})
                },
                {
                    module:
                        Modules.ARCHIVE,
                    view:
                        ARCHIVE_VIEWS.ROOT,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.PROFILE,
                    view:
                        PROFILE_VIEWS.ROOT,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.LOGIN,
                    view:
                        LOGIN_VIEWS.ROOT,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.SETTINGS,
                    view:
                        SETTINGS_VIEWS.ROOT,
                    createState:
                        () => ({})
                },
                {
                    module:
                        Modules.FILE_MANAGER,
                    view:
                        FILE_MANAGER_VIEWS.ROOT,
                    createState:
                        () => ({})
                }
            ]);

        const applicationReferenceResolver =
            new ApplicationReferenceResolver([
                {
                    referenceType:
                        BIBLE_LOCATION_REFERENCE_TYPE,
                    module:
                        Modules.BIBLE,
                    view:
                        BIBLE_VIEWS.READER,
                    createState:
                        (value) => {
                            const bibleLocationRef =
                                parseBibleLocationRef(value);
                            return bibleLocationRef === undefined
                                ? undefined
                                : { bibleLocationRef };
                        }
                }
            ]);

        const navigationViewRegistry =
            new NavigationViewRegistry();

        navigationViewRegistry.registerAll(
            modulesNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            archiveNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            profileNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            loginNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            settingsNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            fileManagerNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            plansNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            bibleNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            refsNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            searchNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            notesNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            bookmarksNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            dictionaryNavigationViewRegistrations
        );

        navigationViewRegistry.registerAll(
            normalizedContentNavigationViewRegistrations
        );

        const navigationViewResolver =
            new NavigationViewResolver(
                navigationViewRegistry
            );

        const navigationStateBuilder =
            new NavigationStateBuilder(
                moduleResourceSelectionBuilder
            );

        const paneNavigationSplitter =
            new PaneNavigationSplitter(
                workspaceRuntime
            );

        const navigationRuntimeFactory =
            new NavigationRuntimeFactory(
                navigationStateBuilder,
                navigationViewResolver,
                moduleResourceSelectionBuilder,
                workspaceRuntime,
                paneNavigationSplitter,
                () => {
                    const destinations = [
                        {
                            module: Modules.MODULES,
                            view: MODULES_VIEWS.ROOT,
                            state: {}
                        }
                    ];

                    if (
                        authenticationService
                            .tryGetUserId() === undefined
                    ) {
                        destinations.push({
                            module: Modules.LOGIN,
                            view: LOGIN_VIEWS.ROOT,
                            state: {}
                        });
                    }

                    return destinations;
                }
            );

        const archiveService =
            new KJVOnlyArchiveService(
                createBrowserKJVOnlyArchiveWorkerClient()
            );

        const moduleResourceSelectionResolver =
            createModuleResourceSelectionResolver(
                moduleResourceSelectionBuilder
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

        const bibleVerseReferenceService =
            new BibleVerseReferenceService();

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
         * ResourceLoader depends only on the generic Resource install
         * capabilities exposed by ResourceWorkerClient.
         *
         * Resource acquisition therefore executes through the worker boundary
         * rather than a main-thread ResourceService.
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

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        BIBLE_TEXT_MARKUP_RESOURCE_TYPE
                    )
                ) {
                    void bibleTextMarkupService.refresh();
                }
            }
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

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        BIBLE_BOOKNAMES_RESOURCE_TYPE
                    )
                ) {
                    bibleBooknamesService.refresh();
                }
            }
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

        // Dictionary Resources install on module entry, not Application startup.
        // Installation is serialized by the existing Dictionary installation service.
        const dictionaryInstallationService =
            new DictionaryInstallationService(
                new IndexedDBDictionaryHeadwordSourceStore(getApplicationDB),
                resourceWorkerClient,
                new DictionaryPublishedIndexPreparer(resourceWorkerClient)
            );

        const dictionaryRuntime =
            new DictionaryRuntime();
        const dictionaryService =
            createDictionaryService(
                dictionaryRuntime,
                dictionaryInstallationService,
                DICTIONARY_EDITIONS_ON_OPEN
            );

        // Refresh accepted editions after archive imports, without downloading Resources.
        archiveService.subscribeToImports(({ importedResourceTypes }) => {
            if (!importedResourceTypes.has(DICTIONARY_RESOURCE_TYPE)) return;
            void dictionaryService.refreshImportedEditions()
                .catch(error => console.warn('[Dictionary archive refresh failed]', error));
        });

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
        // Filesystem

        const mockFilesystemRuntime =
            this.filesystemRuntimeMode ===
                'mock' ?
                new MockFilesystemRuntime() :
                undefined;

        const filesystemStore =
            mockFilesystemRuntime ??
            new IndexedDBFilesystemStore(
                getApplicationDB
            );

        const filesystemSearchRuntime =
            mockFilesystemRuntime ??
            new FilesystemSearchRuntime();

        const filesystemService =
            new FilesystemService(
                filesystemStore,
                filesystemSearchRuntime
            );

        ///////////////////////////////////////////////////////////////////////
        // Normalized Content

        const normalizedContentStore =
            new IndexedDBNormalizedContentStore(
                getApplicationDB
            );

        const normalizedContentResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const normalizedContentService =
            new NormalizedContentService(
                normalizedContentStore,
                normalizedContentResourceLoader,
                new ResourceDescriptorValidator()
            );

        const normalizedContentTextMarkupStore =
            new IndexedDBNormalizedContentTextMarkupStore(
                getApplicationDB
            );

        const normalizedContentTextMarkupResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const normalizedContentTextMarkupWriteTransaction =
            new IndexedDBNormalizedContentTextMarkupWriteTransaction(
                getApplicationDB
            );

        const normalizedContentTextMarkupResourcePublication =
            new NormalizedContentTextMarkupResourcePublication();

        const normalizedContentTextMarkupService =
            new NormalizedContentTextMarkupService(
                normalizedContentTextMarkupStore,
                normalizedContentTextMarkupResourceLoader,
                normalizedContentTextMarkupWriteTransaction,
                normalizedContentTextMarkupResourcePublication,
                outboxProcessor,
                new ResourceDescriptorValidator()
            );

        archiveService.subscribeToImports(
            ({
                importedResourceTypes
            }) => {
                if (
                    importedResourceTypes.has(
                        NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE
                    )
                ) {
                    void normalizedContentTextMarkupService.refresh();
                }
            }
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

        const notesResourceLoader =
            new ResourceLoader<string>(
                resourceWorkerClient,
                appendResourceReferenceBuilder
            );

        const notesSearchRuntime =
            new NotesSearchRuntime();

        const notesAvailabilityService =
            new NotesAvailabilityService(
                notesStore,
                filesystemService
            );

        const notesService =
            new NotesService(
                notesStore,
                notesWriteTransaction,
                notesResourcePublication,
                outboxProcessor,
                notesResourceLoader,
                notesSearchRuntime
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
        // Bookmarks

        const bookmarksService =
            new BookmarksService(
                new IndexedDBBookmarksStore(getApplicationDB),
                new IndexedDBBookmarksWriteTransaction(getApplicationDB),
                new BookmarksResourcePublication(),
                outboxProcessor,
                () => authenticationService.tryGetUserId(),
                bibleLocationReferenceService
            );

        archiveService.subscribeToImports(
            ({ importedResourceTypes }) => {
                if (importedResourceTypes.has(BOOKMARKS_RESOURCE_TYPE)) {
                    bookmarksService.refresh();
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

        const strongsService = new StrongsService(dictionaryService);

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
            petNameService,
            navigationRuntimeFactory,
            moduleLaunchDestinationResolver,
            applicationReferenceResolver,
            resourceModuleResolver,
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
            bibleVerseReferenceService,

            filesystemService,

            normalizedContentService,
            normalizedContentTextMarkupService,

            notesService,
            notesAvailabilityService,
            bookmarksService,

            planDefinitionsService,
            planSubscriptionsService,
            planProgressService,
            plansPubSubService,
            subsEnricherService,
            encodedReadingsDecoderService,

            strongsService,

            dictionaryService
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

        this.authenticationBootstrapUnsubscribe?.();
        this.authenticationBootstrapUnsubscribe =
            undefined;

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

            const userId =
                this.context
                    .authenticationService
                    .tryGetUserId();

            this.context
                .workspaceRuntime
                .initialize();

            this.nostrClient
                .setDefaultRelays(
                    this.config
                        .resourceRelays
                );

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
             * Bootstrap Resource installation requires an
             * authenticated signer because the configured
             * Nostr relay may require AUTH before discovery.
             *
             * Authentication restoration runs before
             * Application.start(). A signed-out or read-only
             * startup therefore skips bootstrap until a later
             * successful authentication transition.
             *
             * Resource processing remains asynchronous and
             * does not block Application.start().
             */
            this.observeAuthenticatedBootstrap();
        } catch (cause) {
            this.state =
                'created';

            this.startPromise =
                undefined;

            throw cause;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Starts each enabled bootstrap policy only while the application is started
     * and signing authentication is available. Install work remains asynchronous.
     */
    private observeAuthenticatedBootstrap():
        void {

        this.authenticationBootstrapUnsubscribe?.();

        this.authenticationBootstrapUnsubscribe =
            this.context
                .authenticationService
                .subscribe(
                    (state) => {
                        if (
                            this.state !==
                                'started' ||
                            state.status !==
                                'authenticated'
                        ) {
                            return;
                        }

                        if (
                            this.applicationBootstrapMode ===
                                'enabled'
                        ) {
                            void this.installBootstrapResources();
                        }

                        if (
                            this.filesystemBootstrapMode ===
                                'enabled' &&
                            this.filesystemRuntimeMode ===
                                'indexeddb'
                        ) {
                            void this
                                .installFilesystemBootstrapResource();
                        }
                    }
                );
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Installs the normal application bootstrap collection and initializes any
     * unambiguous global Resource selections produced by its terminal Resources.
     */
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

    /**
     * Installs the configured application Filesystem through the normal
     * Resource Worker.
     *
     * The mock Filesystem runtime is a development-only UI composition aid and
     * intentionally does not participate in published Filesystem bootstrap.
     */
    private async installFilesystemBootstrapResource():
        Promise<void> {

        try {
            const result =
                await this.resourceWorkerClient
                    .install(
                        FILESYSTEM_BOOTSTRAP_RESOURCE
                    );

            if (!result.found) {
                console.warn(
                    '[Filesystem bootstrap Resource not found]',
                    FILESYSTEM_BOOTSTRAP_RESOURCE
                );

                return;
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
                    '[Filesystem bootstrap Resources incomplete]',
                    incomplete
                );
            }
        } catch (error) {
            console.warn(
                '[Filesystem bootstrap Resource installation failed]',
                {
                    reference:
                        FILESYSTEM_BOOTSTRAP_RESOURCE,

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
                    ...selections.entries()
                ].map(
                    ([
                        resourceType,
                        reference
                    ]) => ({
                        resourceType,
                        ...reference
                    })
                )
            );
    }

}
