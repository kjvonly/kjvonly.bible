<script lang="ts">
	import type {
		NormalizedContent
	} from '@kjvonly/normalized-content';
	import type {
		NormalizedContentTextMarkupMap
	} from '../../models/normalized-content-text-markup.model';
	import {
		getNormalizedContentTextMarkupMarking
	} from '../../models/normalized-content-text-markup.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import type {
		NormalizedContentWordActivationHandler
	} from '../models/normalized-content-word-activation-handler';
	import {
		shouldInsertNormalizedWordSeparator
	} from '../presentation/normalized-inline-spacing';
	import NormalizedWord from './normalizedWord.svelte';

	let {
		content,
		blockId,
		textMarkupMarkings,
		onWordActivate,
		onLinkActivate
	}: {
		content: NormalizedContent[];
		blockId: string;
		textMarkupMarkings?: NormalizedContentTextMarkupMap;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const renderableContent = $derived(
		content.map(
			assertSupportedInlineContent
		)
	);

	/**
	 * Guards the renderer's closed inline mapping so future contract additions
	 * require an explicit presentation decision instead of being silently ignored.
	 */
	function assertSupportedInlineContent(
		item: NormalizedContent
	): NormalizedContent {
		switch (item.type) {
			case 'word':
			case 'anchor':
			case 'line-break':
				return item;
			default:
				return assertUnsupportedInlineContent(
					item
				);
		}
	}

	/** Throws for runtime data outside the renderer's canonical inline contract. */
	function assertUnsupportedInlineContent(
		item: never
	): never {
		throw new Error(
			`Unsupported normalized inline content type: ${(item as { type?: unknown }).type ?? 'missing'}`
		);
	}

	/** Returns user Text Markup classes for one canonical word address. */
	function getTextMarkupClassName(
		contentIndex: number
	): string | undefined {
		const marking =
			getNormalizedContentTextMarkupMarking(
				textMarkupMarkings,
				{
					blockId,
					contentIndex
				}
			);

		return marking?.class.length
			? marking.class.join(' ')
			: undefined;
	}
</script>

{#each renderableContent as item, index}
	{#if item.type === 'word'}
		{#if shouldInsertNormalizedWordSeparator(renderableContent, index)}<span
			class={getTextMarkupClassName(index)}
			data-normalized-content-index={index}
			data-normalized-content-kind="separator"
		>{' '}</span>{/if}<NormalizedWord
			word={item}
			contentIndex={index}
			blockId={blockId}
			textMarkupClassName={getTextMarkupClassName(index)}
			{onWordActivate}
			{onLinkActivate}
		></NormalizedWord>
	{:else if item.type === 'anchor'}
		<span
			id={item.id}
			data-normalized-content-index={index}
			data-normalized-content-kind="anchor"
		></span>
	{:else if item.type === 'line-break'}
		<br
			data-normalized-content-index={index}
			data-normalized-content-kind="line-break"
		/>
	{/if}
{/each}
