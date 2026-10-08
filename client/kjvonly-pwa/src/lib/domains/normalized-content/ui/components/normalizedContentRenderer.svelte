<script lang="ts">
	import type {
		NormalizedDocument
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
	import NormalizedBlockRenderer from './normalizedBlockRenderer.svelte';

	let {
		document,
		textMarkupMarkings,
		onWordActivate,
		onLinkActivate
	}: {
		document: NormalizedDocument;
		textMarkupMarkings?: NormalizedContentTextMarkupMap;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();
</script>

<article class="mx-auto w-full max-w-prose leading-relaxed whitespace-normal">
	{#each document.blocks as block}
		<NormalizedBlockRenderer
			{block}
			{textMarkupMarkings}
			{onWordActivate}
			{onLinkActivate}
		></NormalizedBlockRenderer>
	{/each}
</article>
