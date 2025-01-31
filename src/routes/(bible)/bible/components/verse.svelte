<script lang="ts">
	import Word from './word.svelte';

	let { verse, paneId=$bindable() } = $props();
</script>

{#if verse}

	{#each verse.words as word}
		<Word bind:paneId={paneId} {word}></Word>
	{/each}
{/if}
