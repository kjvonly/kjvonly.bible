<script lang="ts">
	import Word from './word.svelte';

	let { verse, pane=$bindable() } = $props();
</script>

{#if verse}

	{#each verse.words as word}
		<Word bind:pane {verse} {word}></Word>
	{/each}
{/if}
