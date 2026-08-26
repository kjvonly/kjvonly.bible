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

export interface ApplicationContext {
    readonly nostrSigner:
    NostrSigner;

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

    readonly bibleChapterResourceService:
	BibleChapterResourceService;
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