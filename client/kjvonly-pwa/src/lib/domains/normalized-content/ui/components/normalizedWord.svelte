<script lang="ts">
	import type {
		NormalizedWord
	} from '../../models/normalized-content.model';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import {
		resolveNormalizedClasses
	} from '../presentation/normalized-class-resolver';
	import {
		shouldDelegateNormalizedLinkActivation
	} from '../presentation/normalized-link-activation';
	import NormalizedMarkedText from './normalizedMarkedText.svelte';

	let {
		word,
		onLinkActivate
	}: {
		word: NormalizedWord;
		onLinkActivate?: NormalizedContentLinkHandler;
	} = $props();

	const className = $derived(
		resolveNormalizedClasses(
			word.class
		)
	);

	const hrefs = $derived(
		word.href ?? []
	);

	const href = $derived(
		hrefs[0]
	);

	function onClick(
		event: MouseEvent
	): void {
		if (
			!onLinkActivate ||
			hrefs.length ===
				0 ||
			!shouldDelegateNormalizedLinkActivation(
				event
			)
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

{#if href}
	<a
		class={className}
		{href}
		onclick={onClick}
	>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</a>
{:else}
	<span class={className}>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</span>
{/if}
