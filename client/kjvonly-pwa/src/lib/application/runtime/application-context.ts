import {
    getContext,
    setContext
} from 'svelte';

import type {
    ResourceClient
} from '$lib/resource/nostr/resource-client';

import type {
    NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import type {
    ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
    ResourceSelectionService
} from '$lib/application/resources/resource-selection.service';

import type {
    ResourceService
} from '$lib/resource/services/resource.service';
///////////////////////////////////////////////////////////////////////////////
// Bible

import type {
    ChapterService
} from '$lib/domains/bible/services/chapter.service';

import type {
    BibleVersionsService
} from '$lib/domains/bible/services/bibleVersions.service';

import type {
    VerseService
} from '$lib/domains/bible/services/verse.service';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import type {
    StrongsService
} from '$lib/domains/strongs/services/strongs.service';

///////////////////////////////////////////////////////////////////////////////

export interface ApplicationContext {

    readonly nostrSigner:
    NostrSigner;

    ///////////////////////////////////////////////////////////////////////////
    // Resource

    readonly resourceClient:
    ResourceClient;

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
    // Bible

    readonly chapterService:
    ChapterService;

    readonly verseService:
    VerseService;

    readonly bibleVersionsService:
    BibleVersionsService;

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