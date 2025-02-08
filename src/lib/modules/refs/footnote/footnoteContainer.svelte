<script lang="ts">
	import { onMount } from 'svelte';

	let { footnote, footnotes } = $props();
	let footnoteText = $state();

	onMount(() => {
		let key = footnote?.split('_')[2];
		footnoteText = footnotes[key];
	});
</script>

{#if footnoteText}
	{@html footnoteText}
{/if}
