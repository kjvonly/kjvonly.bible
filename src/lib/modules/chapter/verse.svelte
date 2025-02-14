<script lang="ts">
	import Word from './word.svelte';

	let {lastKnownScrollPosition ,chapterKey, footnotes, verse, pane=$bindable() } = $props();
</script>

{#if verse}
	{#each verse.words as word}
		<Word bind:pane {verse} {word} {footnotes} {chapterKey} {lastKnownScrollPosition}></Word>
	{/each}
{/if}
