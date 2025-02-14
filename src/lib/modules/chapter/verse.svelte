<script lang="ts">
	import Word from './word.svelte';
	let mode: any = $state({value: ''})
	let {
		
		lastKnownScrollPosition,
		chapterKey,
		footnotes,
		verse,
		pane = $bindable(),
		annotations = $bindable(),
		
	} = $props();
</script>
{#if verse}
	{#each verse.words as word, idx}
		<Word
			bind:pane
			bind:annotations={annotations}
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
