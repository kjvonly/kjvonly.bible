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

import type { ResourceDiscovery } from '$lib/resource/nostr/resource-discovery';
import type { ResourceResolver } from '$lib/resource/resolution/resource-resolver';


import type {
    ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';
import type { ResourceContentDecoratorBuilder } from '$lib/resource/content/resource-content-decorator-builder';
import type { BibleChapterResourceHandler } from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';
import type { BibleChapterResourceService } from '$lib/domains/bible/resources/chapters/bible-chapter-resource-service';
import type { ChapterService } from '$lib/domains/bible/services/chapter.service';
import type { BibleVersionsService } from '$lib/domains/bible/services/bibleVersions.service';
import type { VerseService } from '$lib/domains/bible/services/verse.service';
import type { StrongsService } from '$lib/domains/strongs/services/strongs.service';
import type { ResourceService } from '$lib/resource/services/resource.service';

export interface ApplicationContext {
    readonly nostrSigner:
    NostrSigner;

    // RESOURCE
    
    readonly resourceClient:
    ResourceClient;

    readonly resourceDiscovery:
    ResourceDiscovery;

    readonly resourceResolver:
    ResourceResolver;

    readonly resourceContentDecoratorBuilder:
    ResourceContentDecoratorBuilder;

    readonly resourceContentDecoder:
    ResourceContentDecoder;

    readonly resourceService:
    ResourceService;


    // BIBLE

    readonly chapterService:
    ChapterService;

    readonly verseService:
    VerseService;

    readonly bibleVersionsService:
    BibleVersionsService;

    // STRONGS
    
    readonly strongsService:
    StrongsService;
}

const APPLICATION_CONTEXT =
    Symbol(
        'kjvonly.application-context'
    );

export function provideApplicationContext(
    context: ApplicationContext
): void {
    setContext(
        APPLICATION_CONTEXT,
        context
    );
}

export function useApplicationContext():
    ApplicationContext {

    const context =
        getContext<
            ApplicationContext |
            undefined
        >(
            APPLICATION_CONTEXT
        );

    if (context === undefined) {
        throw new Error(
            'Application context is not available.'
        );
    }

    return context;
}