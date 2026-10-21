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
	import type {
		NormalizedContentWordMarkers,
		NormalizedContentWordMarkerHandler
	} from '../models/normalized-content-word-marker-handler';
	import NormalizedInlineRenderer from './normalizedInlineRenderer.svelte';
	import NormalizedBlockRenderer from './normalizedBlockRenderer.svelte';

	let {
		block,
		windowIndices,
		orderedListStarts,
		parentType,
		textMarkupMarkings,
		onWordActivate,
		onLinkActivate,
		wordMarkers,
		onWordMarkerActivate,
		bookmarkMarkers,
		onBookmarkMarkerActivate
	}: {
		block: NormalizedBlock;
		/** Leaf positions used to anchor the moving nested window. */
		windowIndices?: ReadonlyMap<string, number>;
		/** Presentation-only list offsets; absent for full-document rendering. */
		orderedListStarts?: ReadonlyMap<string, number>;
		parentType?: NormalizedBlock['type'];
		textMarkupMarkings?: NormalizedContentTextMarkupMap;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
		wordMarkers?: NormalizedContentWordMarkers;
		onWordMarkerActivate?: NormalizedContentWordMarkerHandler;
		bookmarkMarkers?: NormalizedContentWordMarkers;
		onBookmarkMarkerActivate?: NormalizedContentWordMarkerHandler;
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
		data-normalized-window-index={windowIndices?.get(block.id)}
		class={className}
	/>
{:else}
	<svelte:element
		this={presentation.element}
		id={block.id}
		data-normalized-block=""
		data-normalized-window-index={windowIndices?.get(block.id)}
		start={block.type === 'list' && block.ordered ? orderedListStarts?.get(block.id) : undefined}
		class={className}
	>
		{#if presentation.contentKind === 'content'}
			<NormalizedInlineRenderer
				{content}
				blockId={block.id}
				{textMarkupMarkings}
				{onWordActivate}
				{onLinkActivate}
				{wordMarkers}
				{onWordMarkerActivate}
				{bookmarkMarkers}
				{onBookmarkMarkerActivate}
			></NormalizedInlineRenderer>
		{:else if presentation.contentKind === 'blocks'}
			{#each childBlocks as child}
				<NormalizedBlockRenderer
					block={child}
					parentType={block.type}
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
		{/if}
	</svelte:element>
{/if}
