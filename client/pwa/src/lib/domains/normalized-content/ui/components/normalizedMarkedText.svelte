<script lang="ts">
	import type {
		NormalizedWord
	} from '@kjvonly/normalized-content';
	import {
		resolveNormalizedMarks,
		type NormalizedMarkElement
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
		hasElement(
			'sup'
		)
	);
	const subscript = $derived(
		hasElement(
			'sub'
		)
	);
	const underline = $derived(
		hasElement(
			'u'
		)
	);
	const strikethrough = $derived(
		hasElement(
			's'
		)
	);
	const small = $derived(
		hasElement(
			'small'
		)
	);
	const code = $derived(
		hasElement(
			'code'
		)
	);
	const highlight = $derived(
		hasElement(
			'mark'
		)
	);

	/**
	 * Reports whether the resolved canonical marks include one presentation
	 * element.
	 *
	 * @param element Semantic element from the closed normalized mark mapping.
	 * @returns True when the word carries the mark rendered by that element.
	 */
	function hasElement(
		element: NormalizedMarkElement
	): boolean {
		return marks.some(
			(mark) =>
				mark.element ===
					element
		);
	}
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

{#snippet highlightedText()}
	{#if highlight}
		<mark>{@render semanticText()}</mark>
	{:else}
		{@render semanticText()}
	{/if}
{/snippet}

{#snippet codeText()}
	{#if code}
		<code>{@render highlightedText()}</code>
	{:else}
		{@render highlightedText()}
	{/if}
{/snippet}

{#snippet smallText()}
	{#if small}
		<small>{@render codeText()}</small>
	{:else}
		{@render codeText()}
	{/if}
{/snippet}

{#snippet strikethroughText()}
	{#if strikethrough}
		<s>{@render smallText()}</s>
	{:else}
		{@render smallText()}
	{/if}
{/snippet}

{#snippet underlinedText()}
	{#if underline}
		<u>{@render strikethroughText()}</u>
	{:else}
		{@render strikethroughText()}
	{/if}
{/snippet}

{#snippet subscriptText()}
	{#if subscript}
		<sub>{@render underlinedText()}</sub>
	{:else}
		{@render underlinedText()}
	{/if}
{/snippet}

{#if superscript}
	<sup>{@render subscriptText()}</sup>
{:else}
	{@render subscriptText()}
{/if}
