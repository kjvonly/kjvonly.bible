<script lang="ts">
	import type {
		NormalizedBlock
	} from '../../models/normalized-block.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import {
		resolveNormalizedBlockPresentation
	} from '../presentation/normalized-block-presentation';
	import {
		resolveNormalizedClasses
	} from '../presentation/normalized-class-resolver';
	import {
		resolveNormalizedListMarkerClass
	} from '../presentation/normalized-list-presentation';
	import NormalizedInlineRenderer from './normalizedInlineRenderer.svelte';
	import NormalizedBlockRenderer from './normalizedBlockRenderer.svelte';

	let {
		block,
		onLinkActivate
	}: {
		block: NormalizedBlock;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const presentation = $derived(
		resolveNormalizedBlockPresentation(
			block
		)
	);

	const id = $derived(
		block.id ?? undefined
	);

	const className = $derived(
		[
			presentation.classes,
			resolveNormalizedListMarkerClass(
				block
			),
			resolveNormalizedClasses(
				block.class
			)
		]
			.filter(
				Boolean
			)
			.join(
				' '
			) || undefined
	);
</script>

<svelte:element
	this={presentation.element}
	{id}
	class={className}
>
	{#if presentation.contentKind === 'content'}
		<NormalizedInlineRenderer
			content={block.content ?? []}
			{onLinkActivate}
		></NormalizedInlineRenderer>
	{:else}
		{#each block.blocks ?? [] as child}
			<NormalizedBlockRenderer
				block={child}
				{onLinkActivate}
			></NormalizedBlockRenderer>
		{/each}
	{/if}
</svelte:element>
