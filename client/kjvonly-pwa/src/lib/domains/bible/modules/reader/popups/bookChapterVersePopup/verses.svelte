<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';
	// COMPONENTS

	import { BufferBody } from '$lib/application/ui';
	import { BufferContainer } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// // SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import type { BibleBooknames } from '$lib/domains/bible/models/bible-booknames.model';

	// =============================== BINDINGS ================================

	let {
		booknames,
		selectedBookID,
		selectedChapter = $bindable<string>(),
		bibleLocationRef = $bindable<string>(),
		showBookChapterPopup = $bindable<boolean>()
	}: {
		booknames: BibleBooknames;
		selectedBookID: string;
		selectedChapter: string;
		bibleLocationRef: string;
		showBookChapterPopup: boolean;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let verses: number[] = $state([]);
	let bookName = $state('');

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setBookName();
		setVerses();
	});

	// ================================ FUNCS ==================================

	function setBookName(): void {
		bookName = booknames.booknamesById[selectedBookID] ?? '';
	}

	function setVerses(): void {
		const verseCount =
			booknames.bookchapterversecountById[selectedBookID]?.[selectedChapter];

		verses = verseCount
			? Array.from(
				{ length: verseCount },
				(_, index) => index + 1
			)
			: [];
	}

	// ============================== CLICK FUNCS ==============================

	function onBackClicked(e: Event): void {
		e.stopPropagation();
		selectedChapter = '';
	}

	function onVerseSelected(verse: number): void {
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
		{#each verses as verse}
			<button
				class="row-span-1 bg-neutral-50 p-4 hover:bg-neutral-100"
				onclick={() => {
					onVerseSelected(verse);
				}}
			>
				{verse}
			</button>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
