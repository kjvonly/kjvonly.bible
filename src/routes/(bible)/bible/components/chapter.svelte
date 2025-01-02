<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';
	import Verse from './verse.svelte';

	let chapter = '50_3';
	let versemap: Map<string, string>;
	let keys: string[];

	onMount(() => {
		bibleDB.ready.then(() => {
			bibleDB.getValue('chapters', chapter).then((data) => {
				versemap = data['verseMap'];
				keys = Object.keys(versemap).sort((a, b) => (Number(a) < Number(b) ? -1 : 1));
			});
		});
	});
</script>

{#each keys as k}

	<Verse verse={k + ' ' + versemap[k]}></Verse>
{/each}
