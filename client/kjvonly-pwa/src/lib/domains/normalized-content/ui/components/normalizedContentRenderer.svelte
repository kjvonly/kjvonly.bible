<script lang="ts">
	import type {
		NormalizedDocument
	} from '../../models/normalized-document.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import NormalizedBlockRenderer from './normalizedBlockRenderer.svelte';

	let {
		document,
		onLinkActivate
	}: {
		document: NormalizedDocument;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();
</script>

<article class="mx-auto w-full max-w-prose leading-relaxed whitespace-normal">
	{#each document.blocks as block}
		<NormalizedBlockRenderer
			{block}
			{onLinkActivate}
		></NormalizedBlockRenderer>
	{/each}
</article>
