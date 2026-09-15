import {
    getContext,
    setContext
} from 'svelte';

import type {
    NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import type {
    NostrAccountStrategy
} from '$lib/infrastructure/nostr/account/nostr-account-strategy';

import type {
    ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
    ResourceSelectionService
} from '$lib/application/resources/resource-selection.service';

import type {
    ResourceService
} from '$lib/resource/services/resource.service';

import type {
    ModuleBufferFactory
} from '$lib/application/runtime/buffer/module-buffer-factory';

import type {
    ModuleResourceSelectionResolver
} from '$lib/application/resources/module-resource-selection-resolver';

import type {
    AuthenticationService
} from '$lib/application/services/authentication.service';

import type {
    AccountService
} from '$lib/application/services/account/account.service';
///////////////////////////////////////////////////////////////////////////////
// Bible

import type {
    ChapterService
} from '$lib/domains/bible/services/chapter.service';

import type {
    ParagraphsService
} from '$lib/domains/bible/services/paragraphs.service';

import type {
    PericopesService
} from '$lib/domains/bible/services/pericopes.service';

import type {
    BibleTextMarkupService
} from '$lib/domains/bible/services/bible-text-markup.service';

import type {
    BibleBooknamesService
} from '$lib/domains/bible/services/bible-booknames.service';

import type {
    SearchService
} from '$lib/domains/bible/services/search.service';

import type {
    BibleVersionsService
} from '$lib/domains/bible/services/bibleVersions.service';

import type {
    VerseService
} from '$lib/domains/bible/services/verse.service';

///////////////////////////////////////////////////////////////////////////////
// Notes

import type {
    NotesService
} from '$lib/domains/notes/services/notes.service';

///////////////////////////////////////////////////////////////////////////////
// Reading Plans

import type {
    PlanDefinitionsService
} from '$lib/domains/reading-plans/services/plan-definitions.service';

import type {
    PlanSubscriptionsService
} from '$lib/domains/reading-plans/services/plan-subscriptions.service';

import type {
    PlanProgressService
} from '$lib/domains/reading-plans/services/plan-progress.service';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import type {
    StrongsService
} from '$lib/domains/strongs/services/strongs.service';

///////////////////////////////////////////////////////////////////////////////

export interface ApplicationContext {

    readonly authenticationService:
    AuthenticationService;

    readonly accountService:
    AccountService;

    ///////////////////////////////////////////////////////////////////////////
    // Nostr

    readonly nostrClient:
    NostrClient;

    readonly nostrAccountStrategy:
    NostrAccountStrategy;

    ///////////////////////////////////////////////////////////////////////////
    // Resource

    readonly resourceDiscovery:
    ResourceDiscovery;

    readonly resourceService:
    Pick<
        ResourceService,
        'install'
    >;

    readonly resourceSelectionService:
    ResourceSelectionService;

    ///////////////////////////////////////////////////////////////////////////
    // Workspace Runtime

    readonly moduleBufferFactory:
    ModuleBufferFactory;

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