<script lang="ts">
	import type {
		NormalizedWord
	} from '../../models/normalized-content.model';
	import {
		resolveNormalizedMarks
	} from '../presentation/normalized-mark-resolver';

	let {
		word
	}: {
		word: NormalizedWord;
	} = $props();

	const marks = $derived(
		resolveNormalizedMarks(
			word.marks
		)
	);

	const superscript = $derived(
		marks.some(
			(mark) =>
				mark.element ===
					'sup'
		)
	);

	const small = $derived(
		marks.some(
			(mark) =>
				mark.element ===
					'small'
		)
	);
</script>

{#snippet semanticText()}
	{#if word.strong && word.emphasis}
		<strong><em>{word.text}</em></strong>
	{:else if word.strong}
		<strong>{word.text}</strong>
	{:else if word.emphasis}
		<em>{word.text}</em>
	{:else}
		{word.text}
	{/if}
{/snippet}

{#snippet smallText()}
	{#if small}
		<small>{@render semanticText()}</small>
	{:else}
		{@render semanticText()}
	{/if}
{/snippet}

{#if superscript}
	<sup>{@render smallText()}</sup>
{:else}
	{@render smallText()}
{/if}
