<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';
	import Verse from './verse.svelte';

	let book: string;
	let number: string;
	let chapter = '50_3';
	let versemap: any;
	let keys: string[];

	onMount(() => {
		bibleDB.ready.then(() => {
			bibleDB.getValue('chapters', chapter).then((data) => {
				book = data['bookName'];
				number = data['number'];
				versemap = data['verseMap'];
				keys = Object.keys(versemap).sort((a, b) => (Number(a) < Number(b) ? -1 : 1));
			});
		});
	});
</script>

<div class="flex-col">
	{#if book && number}
		<h1 class="text-center font-bold">{book} {number}</h1>
	{/if}
	{#each keys as k}
		<Verse verse={k + ' ' + versemap[k]}></Verse>
	{/each}
</div>
