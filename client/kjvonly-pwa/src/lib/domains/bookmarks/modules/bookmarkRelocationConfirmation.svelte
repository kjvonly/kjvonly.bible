<!-- A Bookmark is only mutated after the user confirms this exact relocation. -->
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
        createBookmarkRelocationCompletedResult,
        parseBookmarkRelocationConfirmationState
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
        navigationState.view !== BOOKMARKS_VIEWS.CONFIRM_RELOCATION) {
        throw new Error('Invalid Bookmark relocation confirmation view');
    }
    const { bookmarkId, destinationBibleLocationRef, destinationPreviewText } =
        parseBookmarkRelocationConfirmationState(navigationState.state);
    let bookmark: Bookmark | undefined = $state();
    let names: Record<string, string> = $state({});
    let loading = $state(true);
    let saving = $state(false);
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
            if (!current || current.target.kind !== 'bible') {
                error = 'Bible bookmark is no longer available.';
            } else {
                bookmark = current;
            }
            const source = moduleResourceSelectionResolver.find(
                navigationState, BIBLE_BOOKNAMES_RESOURCE_TYPE
            );
            if (source) {
                try {
                    const result = await bibleBooknamesService.get(source);
                    if (active) names = result.booknamesById;
                } catch (cause) {
                    console.error('Could not load Bookmark book names', cause);
                }
            }
        } catch (cause) {
            if (active) {
                console.error('Could not load Bookmark for relocation', cause);
                error = 'Could not load Bookmark.';
            }
        } finally {
            if (active) loading = false;
        }
    }

    function label(ref: string): string {
        const [book, chapter, verse] = ref.split('_');
        return `${names[book] ?? book} ${chapter}:${verse}`;
    }

    async function confirm(): Promise<void> {
        if (saving || !bookmark || bookmark.target.kind !== 'bible') return;
        if (bookmark.target.bibleLocationRef === destinationBibleLocationRef) return;
        saving = true;
        error = '';
        try {
            await bookmarksService.relocate(bookmarkId, {
                kind: 'bible', bibleLocationRef: destinationBibleLocationRef
            }, destinationPreviewText);
        } catch (cause) {
            console.error('Could not move Bookmark', cause);
            error = 'Could not move Bookmark. Please try again.';
            saving = false;
            return;
        }
        try {
            await navigation.backWithResult(
                createBookmarkRelocationCompletedResult(destinationBibleLocationRef)
            );
        } catch (cause) {
            console.error('Bookmark moved, but navigation failed', cause);
            error = 'Bookmark moved, but could not return to the Reader.';
        } finally {
            saving = false;
        }
    }
</script>

{#snippet leadingContent()}
    <KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
    <KJVHeader title="Move Bookmark" {leadingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-4">
    {#if loading}
        <p class="py-4 text-sm text-neutral-600">Loading bookmark…</p>
    {:else if bookmark && bookmark.target.kind === 'bible'}
        <div class="flex flex-col gap-4 py-4">
            <p>Move this bookmark?</p>
            <div class="flex flex-col gap-1">
                <p class="text-sm text-neutral-600">Current location</p>
                <p>{label(bookmark.target.bibleLocationRef)}</p>
                {#if bookmark.previewText}<p class="text-sm text-neutral-600">{bookmark.previewText}</p>{/if}
            </div>
            <div class="flex flex-col gap-1">
                <p class="text-sm text-neutral-600">New location</p>
                <p>{label(destinationBibleLocationRef)}</p>
                {#if destinationPreviewText}<p class="text-sm text-neutral-600">{destinationPreviewText}</p>{/if}
            </div>
            {#if bookmark.target.bibleLocationRef === destinationBibleLocationRef}
                <p class="text-sm text-neutral-700">This bookmark is already at the selected location.</p>
            {/if}
            {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
            <div class="flex justify-end gap-3">
                <button type="button" class="min-h-11 px-3 underline" disabled={saving}
                    onclick={() => navigation.back()}>Cancel</button>
                <button type="button" class="min-h-11 rounded-lg border px-4"
                    disabled={saving || bookmark.target.bibleLocationRef === destinationBibleLocationRef}
                    onclick={() => void confirm()}>{saving ? 'Moving…' : 'Move Bookmark'}</button>
            </div>
        </div>
    {:else}
        <p role="alert" class="py-4 text-sm text-neutral-700">{error || 'Bookmark not available.'}</p>
        <button type="button" class="underline" onclick={() => navigation.back()}>Back to bookmarks</button>
    {/if}
</ViewBody>
