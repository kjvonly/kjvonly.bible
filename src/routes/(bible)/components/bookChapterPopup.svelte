<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let bookNames: any;
	let bookIds: any;
	let bookNamesSorted: string[] = $state([]);

	onMount(async () => {
		bookNames = await chapterService.getChapter('booknames');
		bookIds = Object.keys(bookNames['booknamesById']).sort((a, b) =>
			Number(a) < Number(b) ? -1 : 1
		);
        console.log(bookIds)
		for (const i of bookIds) {
            console.log(i)
			bookNamesSorted.push(bookNames['booknamesById'][i]);
		}
	});
</script>

<div class="h-full w-full justify-items-start overflow-y-scroll">
    
	{#each bookNamesSorted as bn}
		<div class="p-4 w-full text-start hover:bg-slate-300">{bn}</div>
	{/each}
</div>
