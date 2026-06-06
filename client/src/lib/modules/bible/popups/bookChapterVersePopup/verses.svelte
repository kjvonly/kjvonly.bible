<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';
	// COMPONENTS

	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// // SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// SERVICES
	import { booksChaptersVerseCountByIDService } from '$lib/services/bibleMetadata/booksChaptersVerseCountByID.service';
	import { bookNamesByIDService } from '$lib/services/bibleMetadata/bookNamesByID.service';

	// =============================== BINDINGS ================================

	let {
		selectedBookID,
		selectedChapter = $bindable<string>(),
		bibleLocationRef = $bindable<string>(),
		showBookChapterPopup = $bindable<boolean>()
	}: {
		selectedBookID: string;
		selectedChapter: string;
		bibleLocationRef: string;
		showBookChapterPopup: boolean;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let verses: any[] = $state([]);
	let bookName = $state('');

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setBookName();
		setVerses();
	});

	// ================================ FUNCS ==================================

	function setBookName(): void {
		bookName = bookNamesByIDService.get(selectedBookID);
	}

	function setVerses(): void {
		let verseCount = booksChaptersVerseCountByIDService
			.get(selectedBookID)
			?.get(selectedChapter);

		verses = verseCount ? Array(Number(verseCount)) : [];
	}

	// ============================== CLICK FUNCS ==============================

	function onBackClicked(e: Event): void {
		e.stopPropagation();
		selectedChapter = '';
	}

	function onVerseSelected(e: Event, verse: number) {
		bibleLocationRef = `${selectedBookID}_${selectedChapter}_${verse}`;
		showBookChapterPopup = false;
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div class="flex w-full flex-row justify-between">
		<KJVButton classes="flex-1" onClick={onBackClicked}>
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>

		<span class="text-center"
			><span>{bookName} {selectedChapter} </span>
			<span class="decoration-primary-500 underline underline-offset-12"
				>Verse</span
			>
		</span>

		<div class="flex-1"></div>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="grid w-[100%] grid-cols-5">
		{#each verses as _, idx}
			<button
				class="hover:bg-primary-50 row-span-1 bg-neutral-50 p-4"
				onclick={(e: Event) => {
					onVerseSelected(e, idx + 1);
				}}
			>
				{idx + 1}
			</button>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
