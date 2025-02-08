<script lang="ts">
	import Word from './word.svelte';

	let { footnotes, verse, pane=$bindable() } = $props();
</script>

{#if verse}

	{#each verse.words as word}
		<Word bind:pane {verse} {word} {footnotes}></Word>
	{/each}
{/if}
