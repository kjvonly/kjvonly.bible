<!-- Deletion belongs to Bookmarks and occurs only after explicit confirmation. -->
<script lang="ts">
    import { onMount } from 'svelte';
    import {
        Modules,
        useApplicationContext,
        useNavigationEntryContext,
        useNavigationRuntimeContext,
        usePaneLayoutContext
    } from '$lib/application';
    import { KJVBackButton, ViewBody, ViewHeader } from '$lib/application/ui';
    import { KJVHeader } from '$lib/components';
    import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';
    import type { Bookmark } from '../models/bookmark.model';
    import {
        BOOKMARKS_VIEWS,
        parseBookmarkDeleteConfirmationState
    } from '../models/bookmarks-navigation.model';

    const {
        bookmarksService,
        bibleBooknamesService,
        moduleResourceSelectionResolver
    } = useApplicationContext();
    const { navigationState } = useNavigationEntryContext();
    const { navigation } = useNavigationRuntimeContext();
    const paneLayout = usePaneLayoutContext();
    const clientHeight = $derived(paneLayout.clientHeight);
    let headerHeight = $state(0);

    if (navigationState.module !== Modules.BOOKMARKS ||
        navigationState.view !== BOOKMARKS_VIEWS.CONFIRM_DELETE) {
        throw new Error('Invalid Bookmark deletion confirmation view');
    }
    const { bookmarkId } = parseBookmarkDeleteConfirmationState(navigationState.state);
    let bookmark: Bookmark | undefined = $state();
    let bookNamesById: Record<string, string> = $state({});
    let loading = $state(true);
    let deleting = $state(false);
    let error = $state('');
    let active = true;

    onMount(() => {
        void load();
        return () => { active = false; };
    });

    async function load(): Promise<void> {
        try {
            const current = await bookmarksService.get(bookmarkId);
            if (!active) return;
            if (!current) {
                error = 'Bookmark is no longer available.';
                return;
            }
            bookmark = current;
            if (current.target.kind !== 'bible') return;
            const source = moduleResourceSelectionResolver.find(
                navigationState, BIBLE_BOOKNAMES_RESOURCE_TYPE
            );
            if (!source) return;
            try {
                const names = await bibleBooknamesService.get(source);
                if (active) bookNamesById = names.booknamesById;
            } catch (cause) {
                console.error('Could not load Bookmark book names', cause);
            }
        } catch (cause) {
            if (active) {
                console.error('Could not load Bookmark for deletion', cause);
                error = 'Could not load Bookmark.';
            }
        } finally {
            if (active) loading = false;
        }
    }

    function label(selected: Bookmark): string {
        if (selected.target.kind === 'normalized-document') {
            return selected.target.document.resourceId;
        }
        const [book, chapter, verse] = selected.target.bibleLocationRef.split('_');
        return `${bookNamesById[book] ?? book} ${chapter}:${verse}`;
    }

    async function confirm(): Promise<void> {
        if (deleting || !bookmark) return;
        deleting = true;
        error = '';
        try {
            await bookmarksService.delete(bookmark.id);
        } catch (cause) {
            console.error('Could not delete Bookmark', cause);
            error = 'Could not delete Bookmark. Please try again.';
            deleting = false;
            return;
        }
        try {
            navigation.back();
        } catch (cause) {
            console.error('Bookmark deleted, but navigation failed', cause);
            bookmark = undefined;
            error = 'Bookmark deleted, but could not return to the list.';
        } finally {
            deleting = false;
        }
    }
</script>

{#snippet leadingContent()}
    <KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
    <KJVHeader title="Delete Bookmark" {leadingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-4">
    {#if loading}
        <p class="py-4 text-sm text-neutral-600">Loading bookmark…</p>
    {:else if bookmark}
        <div class="flex flex-col gap-4 py-4">
            <p>Delete this bookmark?</p>
            <p class="font-medium">{label(bookmark)}</p>
            {#if bookmark.previewText}
                <p class="text-sm text-neutral-600">{bookmark.previewText}</p>
            {/if}
            <p class="text-sm text-neutral-600">This deletes only this bookmark, not other bookmarks at the same location.</p>
            {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
            <div class="flex justify-end gap-3">
                <button type="button" class="min-h-11 px-3 underline" disabled={deleting}
                    onclick={() => navigation.back()}>Cancel</button>
                <button type="button" class="min-h-11 rounded-lg border px-4"
                    disabled={deleting} onclick={() => void confirm()}>
                    {deleting ? 'Deleting…' : 'Delete Bookmark'}
                </button>
            </div>
        </div>
    {:else}
        <p role="alert" class="py-4 text-sm text-neutral-700">{error || 'Bookmark not available.'}</p>
        <button type="button" class="min-h-11 underline" onclick={() => navigation.back()}>Back to bookmarks</button>
    {/if}
</ViewBody>
