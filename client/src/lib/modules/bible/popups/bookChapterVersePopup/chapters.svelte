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
	import Toggle from '$lib/components/toggle.svelte';

	// SERVICES
	import { booksChaptersVerseCountByIDService } from '$lib/services/bibleMetadata/booksChaptersVerseCountByID.service';
	import { bookNamesByIDService } from '$lib/services/bibleMetadata/bookNamesByID.service';
	import { toastService } from '$lib/services/toast.service';

	// =============================== BINDINGS ================================

	let {
		selectedBookID = $bindable<string>(),
		selectedChapter = $bindable<string>(),
		bibleLocationRef = $bindable<string>(),
		showBookChapterPopup = $bindable<boolean>(),
		goToVerses = $bindable<boolean>()
	}: {
		selectedBookID: string;
		selectedChapter: string;
		bibleLocationRef: string;
		showBookChapterPopup: boolean;
		goToVerses: boolean;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let bookName: string = $state('');
	let chapters: string[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setChapters();
		setBookName();
	});

	// ================================ FUNCS ==================================

	function setBookName(): void {
		bookName = bookNamesByIDService.get(selectedBookID);
	}

	function setChapters(): void {
		chapters = booksChaptersVerseCountByIDService
			.get(selectedBookID)
			?.keys()
			.toArray()
			.sort((a, b) => Number(a) - Number(b));
	}

	function chapterSelected(ch: any): void {
		if (goToVerses) {
			selectedChapter = ch;
		} else {
			bibleLocationRef = `${selectedBookID}_${ch}`;
			showBookChapterPopup = false;
		}
	}

	// ============================== CLICK FUNCS ==============================

	function onBackClicked(e: Event): void {
		e.stopPropagation();
		selectedBookID = '';
	}

	function onToggleGoToVerses(e: Event): void {
		e.stopPropagation();
		let message = goToVerses ? 'Go to verses enabled' : 'Go to verses disabled';
		toastService.showToast(message);
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<div class="flex w-full flex-row justify-between">
		<KJVButton classes="flex-1" onClick={onBackClicked}>
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>

		<span class="text-center"
			><span>{bookName} </span>
			<span class="decoration-primary-500 underline underline-offset-12"
				>Chapter</span
			>
			{#if goToVerses}
				<span>Verse</span>
			{/if}
		</span>

		<div class="flex flex-1 justify-end">
			<Toggle onChange={onToggleGoToVerses} bind:isToggled={goToVerses}
			></Toggle>
		</div>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="grid w-[100%] grid-cols-5">
		{#each chapters as ch}
			<button
				class="hover:bg-primary-50 row-span-1 bg-neutral-50 p-4"
				onclick={() => {
					chapterSelected(ch);
				}}
			>
				{ch}
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
