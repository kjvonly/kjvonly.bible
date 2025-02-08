<script lang="ts">
	import { onMount } from 'svelte';

	let {text ,footnote, footnotes } = $props();
	let footnoteText = $state();

	onMount(() => {
		let key = footnote?.split('_')[2];
		footnoteText = footnotes[key];
	});
</script>

{#if footnoteText}
	<div class="pt-6 ">
    		{@html footnoteText}
	</div>
{/if}
