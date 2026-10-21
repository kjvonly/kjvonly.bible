<script lang="ts">
    import { useNavigationEntryContext, useNavigationRuntimeContext } from '$lib/application';
    import { createNormalizedBookmarkBrowseNavigationResult, createNormalizedBookmarkRelocationConfirmedResult } from '$lib/domains/bookmarks';
    import type { NormalizedBookmarkDocumentReference } from '$lib/domains/bookmarks';

    const { navigationState } = useNavigationEntryContext();
    const { navigation } = useNavigationRuntimeContext();
    const document = navigationState.state.normalizedDocument as NormalizedBookmarkDocumentReference;
    const normalizedDestination = navigationState.state.normalizedDestination;
    const destinationPreviewText = navigationState.state.destinationPreviewText;

    /** Select the known canonical word from the Matthew Henry browser fixture. */
    function choose(): void {
        void navigation.backWithResult(createNormalizedBookmarkBrowseNavigationResult({
            kind: 'normalized-document', document,
            address: { kind: 'word', blockId: 'poc-paragraph-3', contentIndex: 6 }
        }));
    }
    /** Simulate Bookmark ID selection and confirmation; Reader performs the write. */
    function confirmRelocation(): void {
        void navigation.backWithResult(createNormalizedBookmarkRelocationConfirmedResult(
            'notes-test-publisher/default/123e4567-e89b-42d3-a456-426614174000',
            normalizedDestination, destinationPreviewText
        ));
    }
</script>

{#if navigationState.state.mode === 'relocate'}
    <div data-testid="normalized-bookmark-relocation-destination">
        <button onclick={confirmRelocation}>Confirm selected bookmark relocation</button>
        <button onclick={() => navigation.back()}>Cancel relocation</button>
    </div>
{:else}
<div data-testid="normalized-bookmark-browse-destination">
    <button onclick={choose}>Select bookmarked word</button>
    <button onclick={() => navigation.back()}>Cancel</button>
</div>

{/if}
