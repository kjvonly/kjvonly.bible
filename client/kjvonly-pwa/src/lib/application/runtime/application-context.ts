import {
    getContext,
    setContext
} from 'svelte';

import type {
    WorkspaceRuntime
} from '$lib/application/runtime/workspace/workspace-runtime';

import type {
    ModuleResourceSelectionResolver
} from '$lib/application/resources/module-resource-selection-resolver';

import type {
    AuthenticationService
} from '$lib/application/services/authentication.service';

import type {
    AccountService
} from '$lib/application/services/account/account.service';

import type {
    ToastService
} from '$lib/application/services/toast.service';

import type {
    SettingsService
} from '$lib/application/services/settings.service';

import type {
    PetNameService
} from '$lib/application/services/pet-name.service';

import type {
    NavigationRuntimeFactory
} from '$lib/application/runtime/navigation/navigation-runtime-factory';

import type {
    ModuleLaunchDestinationResolver
} from '../modules/modules/module-launch-destination-resolver';

import type {
    ApplicationReferenceResolver
} from '../references/application-reference-resolver';

import type {    ResourceModuleResolver
} from '../modules/modules/resource-module-resolver';

import type {
    KJVOnlyArchiveService
} from '$lib/application/archive/kjvonly-archive.service';
///////////////////////////////////////////////////////////////////////////////
// Bible

import type {
    ChapterService,
    ParagraphsService,
    PericopesService,
    BibleTextMarkupService,
    BibleBooknamesService,
    SearchService,
    BibleVersionsService,
    VerseService,
    BookGroupingsService,
    BibleLocationReferenceService,
    BibleNavigationService,
    BibleVerseReferenceService
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Filesystem

import type {
    FilesystemService
} from '$lib/domains/filesystem';

///////////////////////////////////////////////////////////////////////////////
// Normalized Content

import type {
    NormalizedContentService,
    NormalizedContentTextMarkupService
} from '$lib/domains/normalized-content';

///////////////////////////////////////////////////////////////////////////////
// Notes

import type {
    NotesAvailabilityService,
    NotesService
} from '$lib/domains/notes';

///////////////////////////////////////////////////////////////////////////////
// Bookmarks

import type {
    BookmarksService
} from '$lib/domains/bookmarks';

///////////////////////////////////////////////////////////////////////////////
// Reading Plans

import type {
    PlanDefinitionsService,
    PlanSubscriptionsService,
    PlanProgressService,
    PlansPubSubService,
    SubsEnricherService,
    EncodedReadingsDecoderService
} from '$lib/domains/reading-plans';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import type {
    StrongsService
} from '$lib/domains/strongs';

///////////////////////////////////////////////////////////////////////////////
// Dictionary

import type {
    DictionaryService,
    DictionaryEditionSource
} from '$lib/domains/dictionary';

///////////////////////////////////////////////////////////////////////////////

export interface ApplicationContext {

    readonly authenticationService:
    AuthenticationService;

    readonly accountService:
    AccountService;

    readonly toastService:
    ToastService;

    readonly settingsService:
    SettingsService;

    readonly petNameService:
    PetNameService;

    readonly navigationRuntimeFactory:
    NavigationRuntimeFactory;

    readonly moduleLaunchDestinationResolver:
    ModuleLaunchDestinationResolver;

    readonly applicationReferenceResolver:
    ApplicationReferenceResolver;

    readonly resourceModuleResolver:
    ResourceModuleResolver;

    readonly archiveService:
    KJVOnlyArchiveService;

    ///////////////////////////////////////////////////////////////////////////
    // Workspace Runtime

    readonly workspaceRuntime:
    WorkspaceRuntime;

    readonly moduleResourceSelectionResolver:
    ModuleResourceSelectionResolver;

    ///////////////////////////////////////////////////////////////////////////
    // Bible

    readonly chapterService:
    ChapterService;

    readonly paragraphsService:
    ParagraphsService;

    readonly pericopesService:
    PericopesService;

    readonly bibleTextMarkupService:
    BibleTextMarkupService;

    readonly bibleBooknamesService:
    BibleBooknamesService;

    readonly searchService:
    SearchService;

    readonly verseService:
    VerseService;

    readonly bibleVersionsService:
    BibleVersionsService;

    readonly bookGroupingsService:
    BookGroupingsService;

    readonly bibleLocationReferenceService:
    BibleLocationReferenceService;

    readonly bibleNavigationService:
    BibleNavigationService;

    readonly bibleVerseReferenceService:
    BibleVerseReferenceService;

    ///////////////////////////////////////////////////////////////////////////
    // Filesystem

    readonly filesystemService:
    FilesystemService;

    ///////////////////////////////////////////////////////////////////////////
    // Normalized Content

    readonly normalizedContentService:
    NormalizedContentService;

    readonly normalizedContentTextMarkupService:
    NormalizedContentTextMarkupService;

    ///////////////////////////////////////////////////////////////////////////
    // Notes

    readonly notesService:
    NotesService;

    readonly notesAvailabilityService:
    NotesAvailabilityService;

    ///////////////////////////////////////////////////////////////////////////
    // Bookmarks

    readonly bookmarksService:
    BookmarksService;

    ///////////////////////////////////////////////////////////////////////////
    // Reading Plans

    readonly planDefinitionsService:
    PlanDefinitionsService;

    readonly planSubscriptionsService:
    PlanSubscriptionsService;

    readonly planProgressService:
    PlanProgressService;

    readonly plansPubSubService:
    PlansPubSubService;

    readonly subsEnricherService:
    SubsEnricherService;

    readonly encodedReadingsDecoderService:
    EncodedReadingsDecoderService;

    ///////////////////////////////////////////////////////////////////////////
    // Strong's

    readonly strongsService:
    StrongsService;

    ///////////////////////////////////////////////////////////////////////////
    // Dictionary

    readonly dictionaryService:
    DictionaryService;
}

///////////////////////////////////////////////////////////////////////////////

const APPLICATION_CONTEXT =
    Symbol(
        'kjvonly.application-context'
    );

///////////////////////////////////////////////////////////////////////////////

export function provideApplicationContext(
    context:
        ApplicationContext
): void {

    setContext(
        APPLICATION_CONTEXT,
        context
    );
}

///////////////////////////////////////////////////////////////////////////////

export function useApplicationContext():
    ApplicationContext {

    const context =
        getContext<
            ApplicationContext |
            undefined
        >(
            APPLICATION_CONTEXT
        );

    if (
        context ===
        undefined
    ) {
        throw new Error(
            'Application context is not available.'
        );
    }

    return context;
}