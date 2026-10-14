<script lang="ts">
	import type {
		NormalizedWord
	} from '@kjvonly/normalized-content';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import type {
		NormalizedContentWordActivationHandler
	} from '../models/normalized-content-word-activation-handler';
	import {
		resolveNormalizedClasses
	} from '../presentation/normalized-class-resolver';
	import {
		shouldDelegateNormalizedLinkActivation
	} from '../presentation/normalized-link-activation';
	import NormalizedMarkedText from './normalizedMarkedText.svelte';

	let {
		word,
		blockId,
		contentIndex,
		textMarkupClassName,
		onWordActivate,
		onLinkActivate
	}: {
		word: NormalizedWord;
		blockId: string;
		contentIndex: number;
		textMarkupClassName?: string;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const className = $derived(
		[
			resolveNormalizedClasses(
				word.class
			),
			textMarkupClassName
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const hrefs = $derived(
		word.href ?? []
	);

	const primaryHref = $derived(
		hrefs[0]
	);

	const hasPrimaryHref = $derived(
		primaryHref !== undefined
	);

	/**
	 * Delegates one ordinary word activation before linked-word navigation.
	 * Modified gestures remain native browser behavior.
	 */
	function onClick(
		event: MouseEvent
	): void {
		if (
			!shouldDelegateNormalizedLinkActivation(
				event
			)
		) {
			return;
		}

		if (
			onWordActivate?.({
				blockId,
				contentIndex
			})
		) {
			event.preventDefault();
			return;
		}

		if (
			!onLinkActivate ||
			hrefs.length === 0
		) {
			return;
		}

		if (
			onLinkActivate(
				hrefs
			)
		) {
			event.preventDefault();
		}
	}
</script>

{#if hasPrimaryHref}
	<a
		class={['text-primary-500 underline underline-offset-2', className].filter(Boolean).join(' ')}
		href={primaryHref}
		data-normalized-content-index={contentIndex}
		data-normalized-content-kind="word"
		onclick={onClick}
	>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</a>
{:else}
	<span
		class={className}
		data-normalized-content-index={contentIndex}
		data-normalized-content-kind="word"
		onclick={onClick}
	>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</span>
{/if}
