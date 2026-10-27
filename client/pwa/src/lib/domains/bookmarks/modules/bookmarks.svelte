<!-- Bookmarks owns list presentation. The Bible Reader remains the owner of verse/word selection. -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { NavigationStateValue } from '$lib/application';
    import {
        Modules,
        MODULES_VIEWS,
        PaneSplit,
        useApplicationContext,
        useNavigationEntryContext,
        useNavigationRuntimeContext,
        usePaneLayoutContext
    } from '$lib/application';
    import { KJVBackButton, KJVMoreActionsButton, ViewBody, ViewHeader } from '$lib/application/ui';
    import { KJVHeader } from '$lib/components';
    import Bible from '$lib/components/svgs/bible.svelte';
    import Article from '$lib/components/svgs/article.svelte';
    import Delete from '$lib/components/svgs/delete.svelte';
    import KJVIconButton from '$lib/components/buttons/KJVIconButton.svelte';
    import { BIBLE_BOOKNAMES_RESOURCE_TYPE, BIBLE_VIEWS } from '$lib/domains/bible';
    import type { Bookmark } from '../models/bookmark.model';
    import {
        BOOKMARKS_VIEWS,
        BOOKMARKS_LIST_ACTIONS,
        parseBookmarksListActionResult,
        createBookmarkBrowseNavigationResult,
        createNormalizedBookmarkBrowseNavigationResult,
        parseBookmarkRelocationCompletedResult,
        parseNormalizedBookmarkRelocationConfirmedResult,
        parseBookmarksNavigationIntent
    } from '../models/bookmarks-navigation.model';
    import { filterBookmarksForNavigation } from '../services/bookmarks-navigation-filter';
    import { openNormalizedBookmarkFromMain } from './runtime/open-normalized-bookmark';
    import { formatBookmarkUpdatedAt, sortBookmarksByUpdatedAt } from './bookmarks-list-presentation';

    const {
        bookmarksService,
        toastService,
        bibleBooknamesService,
        bibleLocationReferenceService,
        moduleResourceSelectionResolver,
        filesystemService,
        resourceModuleResolver
    } = useApplicationContext();
    const { navigationState, onResult, whenActive } = useNavigationEntryContext();
    const { navigation } = useNavigationRuntimeContext();
    const paneLayout = usePaneLayoutContext();
    const clientHeight = $derived(paneLayout.clientHeight);
    let headerHeight = $state(0);

    if (navigationState.module !== Modules.BOOKMARKS ||
        navigationState.view !== BOOKMARKS_VIEWS.ROOT) {
        throw new Error('Invalid Bookmarks view');
    }
    const intent = parseBookmarksNavigationIntent(navigationState.state);
    const relocation = intent.mode === 'relocate' ? intent : undefined;
    const browse = intent.mode !== 'relocate' ? intent : undefined;
    const normalizedTarget = browse?.normalizedTarget;
    const normalizedDocument = browse?.normalizedDocument;
    const bibleChapterRef = browse?.bibleChapterRef;
    const bibleLocationRef = browse?.bibleLocationRef;
    const returnBibleLocationToReader = browse?.returnBibleLocationToReader ?? false;
    let bookmarks: readonly Bookmark[] = $state([]);
    let bookNamesById: Record<string, string> = $state({});
    let loading = $state(true);
    let error = $state(false);
    let request = 0;
    let activeView = true;
    // Sorting is presentation policy; scope selection belongs to a tested Domain helper.
    const visibleBookmarks = $derived(sortBookmarksByUpdatedAt(
        filterBookmarksForNavigation(bookmarks, intent, bibleLocationReferenceService)
    ));

    /** Forward a successfully confirmed relocation after this list becomes active again. */
    function onNavigationResult(result: NavigationStateValue): void {
        const listAction = parseBookmarksListActionResult(result);
        if (listAction) {
            whenActive(() => {
                const direction = listAction.action === BOOKMARKS_LIST_ACTIONS.SPLIT_VERTICAL
                    ? PaneSplit.VERTICAL
                    : PaneSplit.HORIZONTAL;
                navigation.split(direction, Modules.MODULES, MODULES_VIEWS.ROOT, {});
            });
            return;
        }
        if (!relocation) return;
        const normalizedConfirmation = parseNormalizedBookmarkRelocationConfirmedResult(result);
        if (normalizedConfirmation) {
            whenActive(() => { void navigation.backWithResult(normalizedConfirmation); });
            return;
        }
        const completed = parseBookmarkRelocationCompletedResult(result);
        if (!completed) return;
        whenActive(() => navigation.backWithResult(
            createBookmarkBrowseNavigationResult(completed.bibleLocationRef)
        ));
    }

    function onOpenActions(): void {
        navigation.pushView(BOOKMARKS_VIEWS.ACTIONS, {});
    }

    onMount(() => {
        const unsubscribeResult = onResult(onNavigationResult);
        async function refresh(): Promise<void> {
            const current = ++request;
            try {
                const result = await bookmarksService.list();
                if (!activeView || current !== request) return;
                bookmarks = result;
                error = false;
            } catch (cause) {
                if (!activeView || current !== request) return;
                error = true;
                console.error('Failed to load Bookmarks', cause);
            } finally {
                if (activeView && current === request) loading = false;
            }
        }
        const unsubscribe = bookmarksService.subscribe(() => void refresh());
        void refresh();
        void loadBooknames();
        return () => {
            activeView = false;
            request++;
            unsubscribe();
            unsubscribeResult();
        };
    });

    /** Resolve names from the same selected Bible Booknames Resource used by Notes. */
    async function loadBooknames(): Promise<void> {
        const source = moduleResourceSelectionResolver.find(
            navigationState,
            BIBLE_BOOKNAMES_RESOURCE_TYPE
        );
        if (!source) return;
        try {
            const names = await bibleBooknamesService.get(source);
            if (!activeView) return;
            bookNamesById = names.booknamesById;
        } catch (cause) {
            if (activeView) console.error('Failed to load Bookmark book names', cause);
        }
    }

    /** Return to the originating Reader, or open one when browsing standalone. */
    async function openBookmark(bookmark: Bookmark): Promise<void> {
        if (relocation) {
            // Confirmation selects the ID. The normalized Reader owns its loaded document
            // and performs the validated write after confirmation returns.
            navigation.pushView(BOOKMARKS_VIEWS.CONFIRM_RELOCATION, {
                bookmarkId: bookmark.id, ...relocation
            });
            return;
        }
        if (bookmark.target.kind === 'normalized-document') {
            if (normalizedDocument) {
                try {
                    await navigation.backWithResult(createNormalizedBookmarkBrowseNavigationResult(bookmark.target));
                } catch (cause) {
                    console.error('Could not return to normalized Bookmark word', cause);
                    toastService.showToast('Could not open Bookmark');
                }
            } else if (normalizedTarget) {
                await navigation.back();
            } else {
                // Main Bookmarks view: resolve a mounted Resource descriptor and
                // open its registered Reader at this bookmarked word.
                try {
                    const opened = await openNormalizedBookmarkFromMain(bookmark.target, {
                        filesystemService, resourceModuleResolver, navigation
                    });
                    if (!opened) {
                        toastService.showToast('Bookmarked document is not available in mounted files');
                    }
                } catch (cause) {
                    console.error('Could not open normalized Bookmark', cause);
                    toastService.showToast('Could not open bookmarked document');
                }
            }
            return;
        }
        const locationRef = bookmark.target.bibleLocationRef;
        try {
            if (returnBibleLocationToReader) {
                await navigation.backWithResult(createBookmarkBrowseNavigationResult(locationRef));
                return;
            }
            navigation.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {
                bibleLocationRef: locationRef
            });
        } catch (cause) {
            console.error('Could not open Bookmark', cause);
            toastService.showToast('Could not open Bookmark');
        }
    }

    /** Open a separate confirmation view; the primary row action remains untouched. */
    function requestDelete(bookmark: Bookmark): void {
        navigation.pushView(BOOKMARKS_VIEWS.CONFIRM_DELETE, { bookmarkId: bookmark.id });
    }

    /** Label canonical Bible references with the selected Booknames Resource. */
    function labelBibleLocation(bibleLocationRef: string): string {
        const [book, chapter, verse] = bibleLocationRef.split('_');
        return `${bookNamesById[book] ?? book} ${chapter}:${verse}`;
    }

    /** Format one exact Bible target using configured book names. */
    function label(bookmark: Bookmark): string {
        if (bookmark.target.kind === 'normalized-document') {
            return bookmark.target.document.resourceId;
        }
        return labelBibleLocation(bookmark.target.bibleLocationRef);
    }
</script>

{#snippet leadingContent()}
    <KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
    <KJVMoreActionsButton onClick={onOpenActions}></KJVMoreActionsButton>
{/snippet}

{#snippet bookmarkDetails(bookmark: Bookmark)}
    {#if bookmark.target.kind === 'bible'}
        <Bible classes="h-5 w-5 shrink-0 fill-current text-neutral-600" />
    {:else}
        <Article classes="h-5 w-5 shrink-0 fill-current text-neutral-600" />
    {/if}
    <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span class="break-words text-sm text-neutral-700">{label(bookmark)}</span>
            <span class="text-xs text-neutral-500">{formatBookmarkUpdatedAt(bookmark.updatedAt)}</span>
        </div>
        {#if bookmark.previewText}
            <p class="break-words text-base leading-relaxed text-neutral-700">{bookmark.previewText}</p>
        {/if}
    </div>
{/snippet}

<ViewHeader bind:headerHeight>
    <KJVHeader title={relocation ? 'Select bookmark to move' : normalizedDocument ? 'Document Bookmarks' : normalizedTarget ? 'Word Bookmarks' : bibleLocationRef ? 'Location Bookmarks' : bibleChapterRef ? 'Chapter Bookmarks' : 'Bookmarks'} {leadingContent} {trailingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-4">
    {#if relocation}
        <p class="py-3 text-sm text-neutral-700">{relocation.normalizedDestination !== undefined
            ? 'Choose an existing document bookmark to relocate.'
            : `Choose an existing Bible bookmark to move to ${labelBibleLocation(relocation.destinationBibleLocationRef!)}`}</p>
    {/if}
    {#if loading}
        <p class="py-4 text-sm text-neutral-600">Loading bookmarks…</p>
    {:else if error}
        <p class="py-4 text-sm text-neutral-700" role="alert">Could not load bookmarks.</p>
        <button type="button" class="underline" onclick={() => bookmarksService.refresh()}>Retry</button>
    {:else if visibleBookmarks.length === 0}
        <p class="py-4 text-sm text-neutral-600">{relocation ? 'No bookmarks available to move.' : 'No bookmarks here yet.'}</p>
    {:else}
        <ul>
            {#each visibleBookmarks as bookmark (bookmark.id)}
                <li class="py-3 transition-colors duration-150 hover:bg-neutral-100 focus-within:bg-neutral-100">
                    {#if bookmark.target.kind === 'bible' || relocation || (!normalizedTarget && !normalizedDocument)}
                        <button
                            type="button"
                            class="flex min-h-12 w-full min-w-0 items-start gap-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-primary-500"
                            aria-label={`${relocation ? 'Select bookmark at' : 'Open bookmark at'} ${label(bookmark)}`}
                            onclick={() => void openBookmark(bookmark)}
                        >
                            {@render bookmarkDetails(bookmark)}
                        </button>
                    {:else if normalizedTarget || normalizedDocument}
                        <!-- Both normalized Browse modes return to their mounted Reader. -->
                        <button
                            type="button"
                            class="flex min-h-12 w-full min-w-0 items-start gap-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-primary-500"
                            aria-label="Return to bookmarked word"
                            onclick={() => void openBookmark(bookmark)}
                        >
                            {@render bookmarkDetails(bookmark)}
                        </button>
                    {/if}
                    {#if !relocation}
                        <div class="flex justify-end gap-2 pb-2">
                            <KJVIconButton
                                label={`Delete bookmark at ${label(bookmark)}`}
                                variant="quiet"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    requestDelete(bookmark);
                                }}
                            >
                                <Delete classes="h-5 w-5" />
                            </KJVIconButton>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</ViewBody>
