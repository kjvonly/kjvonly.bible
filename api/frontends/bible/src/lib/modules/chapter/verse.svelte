<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Word from './word.svelte';
	let {
		lastKnownScrollPosition,
		chapterKey,
		footnotes,
		verse,
		pane = $bindable(),
		annotations = $bindable(),
		notes = $bindable(),
		mode = $bindable(),
	} = $props();

	function a() {}

</script>

{#if verse}
	{#each verse.words as word, idx}
		<Word
			bind:pane
			bind:annotations
			bind:notes
			bind:mode
			{verse}
			{word}
			{footnotes}
			{chapterKey}
			{lastKnownScrollPosition}
			wordIdx={idx}
		></Word>
	{/each}
{/if}
