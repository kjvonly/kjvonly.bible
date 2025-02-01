<script lang="ts">
	import Word from './word.svelte';

	let { verse, paneId } = $props();
</script>

{#if verse}

	{#each verse.words as word}
		<Word paneId={paneId} {word}></Word>
	{/each}
{/if}
