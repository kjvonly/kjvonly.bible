<script lang="ts">
	import type {
		NormalizedDocument,
		NormalizedBlock
	} from '@kjvonly/normalized-content';
	import type {
		NormalizedContentTextMarkupMap
	} from '../../models/normalized-content-text-markup.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import type {
		NormalizedContentWordActivationHandler
	} from '../models/normalized-content-word-activation-handler';
	import type {
		NormalizedContentWordMarkers,
		NormalizedContentWordMarkerHandler
	} from '../models/normalized-content-word-marker-handler';
	import NormalizedBlockRenderer from './normalizedBlockRenderer.svelte';

	let {
		document,
		visibleBlocks,
		windowIndices,
		orderedListStarts,
		textMarkupMarkings,
		onWordActivate,
		onLinkActivate,
		wordMarkers,
		onWordMarkerActivate,
		bookmarkMarkers,
		onBookmarkMarkerActivate
	}: {
		document: NormalizedDocument;
		/** Optional bounded top-level block window; omitted by ordinary full-document consumers. */
		visibleBlocks?: readonly NormalizedBlock[];
		/** Canonical leaf IDs to one-based DOM window indices. */
		windowIndices?: ReadonlyMap<string, number>;
		/** Original ordinal of the first mounted item in each ordered list. */
		orderedListStarts?: ReadonlyMap<string, number>;
		textMarkupMarkings?: NormalizedContentTextMarkupMap;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
		wordMarkers?: NormalizedContentWordMarkers;
		onWordMarkerActivate?: NormalizedContentWordMarkerHandler;
		bookmarkMarkers?: NormalizedContentWordMarkers;
		onBookmarkMarkerActivate?: NormalizedContentWordMarkerHandler;
	} = $props();
</script>

<article class="mx-auto w-full max-w-prose leading-relaxed whitespace-normal">
	{#each visibleBlocks ?? document.blocks as block, index (block.id)}
		<NormalizedBlockRenderer
			{block}
			{windowIndices}
			{orderedListStarts}
			{textMarkupMarkings}
			{onWordActivate}
			{onLinkActivate}
			{wordMarkers}
			{onWordMarkerActivate}
			{bookmarkMarkers}
			{onBookmarkMarkerActivate}
		></NormalizedBlockRenderer>
	{/each}
</article>
