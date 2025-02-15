<script lang="ts">
	import Word from './word.svelte';
	let {
		
		lastKnownScrollPosition,
		chapterKey,
		footnotes,
		verse,
		pane = $bindable(),
		annotations = $bindable(),
		mode = $bindable()
	} = $props();
</script>

{#if verse}
	{#each verse.words as word, idx}
		<Word
			bind:pane
			bind:annotations
			bind:mode={mode}
			{verse}
			{word}
			{footnotes}
			{chapterKey}
			{lastKnownScrollPosition}
			wordIdx={idx}
		></Word>
	{/each}
{/if}
