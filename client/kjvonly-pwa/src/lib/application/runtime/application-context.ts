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
    NavigationServiceFactory
} from '$lib/application/services/navigation-service-factory';
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
    BibleNavigationService
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Notes

import type {
    NotesService
} from '$lib/domains/notes';

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

export interface ApplicationContext {

    readonly authenticationService:
    AuthenticationService;

    readonly accountService:
    AccountService;

    readonly toastService:
    ToastService;

    readonly settingsService:
    SettingsService;

    readonly navigationServiceFactory:
    NavigationServiceFactory;

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

    ///////////////////////////////////////////////////////////////////////////
    // Notes

    readonly notesService:
    NotesService;

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