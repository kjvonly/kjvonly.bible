<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let { chapterKey = $bindable(), showBookChapterPopup = $bindable() } = $props();
	let bookNames: any = $state();
	let bookIds: any;
	let bookNamesSorted: any[] = $state([]);

	let selectedBook: any = $state();

	onMount(async () => {
		bookNames = await chapterService.getChapter('booknames');
		bookIds = Object.keys(bookNames['booknamesById']).sort((a, b) =>
			Number(a) < Number(b) ? -1 : 1
		);

		for (const i of bookIds) {
			bookNamesSorted.push({ id: i, name: bookNames['booknamesById'][i] });
		}
	});

	function bookSelected(event: Event, bn: any) {
		event.stopPropagation();
		selectedBook = bn;
	}
	function chapterSelected(ch: any) {
		chapterKey = `${selectedBook.id}_${ch}`;
		showBookChapterPopup = false;
        selectedBook = undefined
	}
</script>

<div class="h-full w-full justify-start justify-items-start overflow-y-scroll">
	{#if selectedBook}
		<div class="grid w-[100%] grid-cols-5 gap-4">
			{#each new Array(bookNames['maxChapterById'][selectedBook.id]).keys() as ch}
				<button onclick={() => chapterSelected(ch + 1)} class="row-span-1 p-4 hover:bg-slate-300"
					>{ch + 1}</button
				>
			{/each}
		</div>
	{:else}
		{#each bookNamesSorted as bn}
			<button
				onclick={(event) => bookSelected(event, bn)}
				class="w-full p-4 text-start hover:bg-slate-300">{bn.name}</button
			>
		{/each}
	{/if}
</div>
