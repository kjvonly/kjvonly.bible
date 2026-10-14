<script lang="ts">
    import { useNavigationRuntimeContext, usePaneLayoutContext } from '$lib/application';
    import { KJVBackButton } from '$lib/application/ui';
    import { KJVMenuView, type KJVMenuAction } from '$lib/components';
    import {
        BOOKMARKS_LIST_ACTIONS,
        createBookmarksListActionResult,
        type BookmarksListAction
    } from '../models/bookmarks-navigation.model';

    const { navigation } = useNavigationRuntimeContext();
    const paneLayout = usePaneLayoutContext();
    const clientHeight = $derived(paneLayout.clientHeight);

    const actions: readonly KJVMenuAction<BookmarksListAction>[] = [
        { label: 'Split horizontally', value: BOOKMARKS_LIST_ACTIONS.SPLIT_HORIZONTAL },
        { label: 'Split vertically', value: BOOKMARKS_LIST_ACTIONS.SPLIT_VERTICAL }
    ];

    /** Return the command to the mounted Bookmarks list rather than splitting from the menu. */
    async function onAction(action: BookmarksListAction): Promise<void> {
        await navigation.backWithResult(createBookmarksListActionResult(action));
    }
</script>

{#snippet leadingContent()}
    <KJVBackButton></KJVBackButton>
{/snippet}

<KJVMenuView title="More actions" {clientHeight} {actions} {leadingContent} {onAction}></KJVMenuView>
