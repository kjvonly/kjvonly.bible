<script lang="ts">
	import type {
		NormalizedContent
	} from '../../models/normalized-content.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import NormalizedWord from './normalizedWord.svelte';

	let {
		content,
		onLinkActivate
	}: {
		content: NormalizedContent[];
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const renderableContent = $derived(
		content.map(
			assertSupportedContent
		)
	);

	function assertSupportedContent(
		item: NormalizedContent
	): NormalizedContent {
		if (
			item.type ===
				'word' ||
			item.type ===
				'line-break'
		) {
			return item;
		}

		throw new Error(
			`Unsupported normalized inline content type: ${(item as { type?: unknown }).type ?? 'missing'}`
		);
	}
</script>

{#each renderableContent as item, index}
	{#if item.type === 'word'}
		<NormalizedWord
			word={item}
			{onLinkActivate}
		></NormalizedWord>{#if renderableContent[index + 1]?.type === 'word'}{' '}{/if}
	{:else if item.type === 'line-break'}
		<br />
	{/if}
{/each}
