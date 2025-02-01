<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { strongsRef } = $props();

	let strongs: any | undefined = $state();
	onMount(() => {
		if (strongsRef) {
			bibleDB.getValue('strongs', strongsRef.toLowerCase()).then((data) => {
				strongs = data;
			});
		}
	});
</script>

{#if strongs}
	<div>{JSON.stringify(strongs, null, 2)}</div>
{/if}
