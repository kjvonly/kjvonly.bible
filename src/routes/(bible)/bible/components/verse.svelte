<script lang="ts">
	import Word from './word.svelte';

	let { verse } = $props();
</script>

{#if verse}

	{#each verse.words as word}
		<Word {word}></Word>
	{/each}
{/if}
