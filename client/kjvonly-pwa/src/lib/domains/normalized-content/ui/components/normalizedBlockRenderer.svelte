<script lang="ts">
	import type {
		NormalizedBlock,
		NormalizedContent
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
		parentType,
		textMarkupMarkings,
		onWordActivate,
		onLinkActivate
	}: {
		block: NormalizedBlock;
		parentType?: NormalizedBlock['type'];
		textMarkupMarkings?: NormalizedContentTextMarkupMap;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const presentation = $derived(
		resolveNormalizedBlockPresentation(
			block,
			{
				parentType
			}
		)
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

	const content = $derived(
		getInlineContent(
			block
		)
	);

	const childBlocks = $derived(
		getChildBlocks(
			block
		)
	);

	/** Returns canonical inline content for block variants that own it. */
	function getInlineContent(
		candidate: NormalizedBlock
	): NormalizedContent[] {
		return 'content' in candidate
			? candidate.content
			: [];
	}

	/** Returns canonical child blocks for structural block variants that own them. */
	function getChildBlocks(
		candidate: NormalizedBlock
	): NormalizedBlock[] {
		return 'blocks' in candidate
			? candidate.blocks
			: [];
	}
</script>

{#if block.type === 'thematic-break'}
	<hr
		id={block.id}
		data-normalized-block=""
		class={className}
	/>
{:else}
	<svelte:element
		this={presentation.element}
		id={block.id}
		data-normalized-block=""
		class={className}
	>
		{#if presentation.contentKind === 'content'}
			<NormalizedInlineRenderer
				{content}
				blockId={block.id}
				{textMarkupMarkings}
				{onWordActivate}
				{onLinkActivate}
			></NormalizedInlineRenderer>
		{:else if presentation.contentKind === 'blocks'}
			{#each childBlocks as child}
				<NormalizedBlockRenderer
					block={child}
					parentType={block.type}
					{textMarkupMarkings}
					{onWordActivate}
					{onLinkActivate}
				></NormalizedBlockRenderer>
			{/each}
		{/if}
	</svelte:element>
{/if}
