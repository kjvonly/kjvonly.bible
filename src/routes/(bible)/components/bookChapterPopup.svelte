<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let { chapterKey = $bindable(), showBookChapterPopup = $bindable() } = $props();
	let bookNames: any = $state();
	let bookIds: any;
	let bookNamesSorted: any[] = $state([]);
	let filteredBooks: any[] = $state([]);
	let filterText: string = $state('');
	let selectedBook: any = $state();

	$effect(() => {
		filterText;

		filteredBooks = bookNamesSorted.filter((book: { name: string; id: number }) => {
			return book.name.toLowerCase().includes(filterText);
		});
	});

	onMount(async () => {
		bookNames = await chapterService.getChapter('booknames');
		bookIds = Object.keys(bookNames['booknamesById']).sort((a, b) =>
			Number(a) < Number(b) ? -1 : 1
		);

		for (const i of bookIds) {
			bookNamesSorted.push({ id: i, name: bookNames['booknamesById'][i] });
			filteredBooks.push({ id: i, name: bookNames['booknamesById'][i] });
		}
	});

	function bookSelected(event: Event, bn: any) {
		event.stopPropagation();
		selectedBook = bn;
	}
	function chapterSelected(ch: any) {
		chapterKey = `${selectedBook.id}_${ch}`;
		showBookChapterPopup = false;
		selectedBook = undefined;
	}
</script>

<div class="h-full w-full justify-start justify-items-start overflow-y-scroll">
	<header
		class="items sticky top-0 w-full flex-col border-b-2  bg-neutral-100 text-neutral-700"
	>
		<div class="flex w-full justify-between p-2 ">
			<div class="h-12 w-12">
				<button
					onclick={() => {
						selectedBook = undefined;
					}}
					hidden={selectedBook === undefined}
					aria-label="back to book button"
				>
					<svg
						class="h-12 w-12 p-4"
						version="1.1"
						width="34.484818"
						height="58.242714"
						viewBox="0 0 34.484818 58.242714"
						xmlns="http://www.w3.org/2000/svg"
					>
						<g id="g8" transform="translate(-40,-34.843996)">
							<path
								class="fill-neutral-700"
								style="stroke-width:1.33333"
								d="M 53,80.35758 C 43.505656,70.810684 40,66.386425 40,63.951131 c 0,-2.445847 3.49976,-6.821123 13.132229,-16.417448 11.374404,-11.331724 13.649954,-13.023883 17,-12.641652 2.904499,0.331396 3.980004,1.235166 4.318418,3.62886 0.353064,2.497337 -1.95028,5.601021 -10.637231,14.333333 L 52.725541,64 63.813416,75.145776 C 72.500367,83.878088 74.803711,86.981772 74.450647,89.479109 74.105181,91.922689 73.066399,92.755693 70,93.048101 66.510733,93.380832 64.340117,91.760465 53,80.35758 Z"
								id="path170"
							/>
						</g>
					</svg>
				</button>
			</div>
			<div class="flex items-center">
				{#if selectedBook}
					<h1 class=" text-center text-lg">CHAPTER</h1>
				{:else}
					<h1 class=" text-center text-lg">Book</h1>
				{/if}
			</div>
			<button
				onclick={() => {
					showBookChapterPopup = false;
				}}
				class="m-0 p-0"
			>
				Cancel
			</button>
		</div>

		{#if selectedBook === undefined}
			<div class="p-2">
				<label class="sr-only" for="name">Name</label>
				<input
					class="w-full rounded-lg border fill-neutral-100 p-3 text-sm "
					placeholder="Filter Books..."
					type="text"
					id="name"
					bind:value={filterText}
				/>
			</div>
		{/if}
	</header>

	{#if selectedBook}
		<div class="grid w-[100%] grid-cols-5 gap-4 ">
			{#each new Array(bookNames['maxChapterById'][selectedBook.id]).keys() as ch}
				<button
					onclick={() => chapterSelected(ch + 1)}
					class="row-span-1 p-4 hover:bg-primary-50 bg-neutral-50">{ch + 1}</button
				>
			{/each}
		</div>
	{:else}
		{#each filteredBooks as bn}
			<div class="w-full">
				<button
					onclick={(event) => bookSelected(event, bn)}
					class="w-full p-4 text-start hover:bg-primary-50 bg-neutral-50">{bn.name}</button
				>
			</div>
		{/each}
	{/if}
</div>
