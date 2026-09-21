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
	import Toggle from '$lib/components/toggle.svelte';

	import { useApplicationContext } from '$lib/application';

	// MODELS
	import type { BibleBooknames } from '../../../../models/bible-booknames.model';

	// SERVICES

	const { toastService } =
		useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		booknames,
		selectedBookID = $bindable<string>(),
		selectedChapter = $bindable<string>(),
		bibleLocationRef = $bindable<string>(),
		showBookChapterPopup = $bindable<boolean>(),
		goToVerses = $bindable<boolean>()
	}: {
		booknames: BibleBooknames;
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
		bookName = booknames.booknamesById[selectedBookID] ?? '';
	}

	function setChapters(): void {
		chapters = Object.keys(
			booknames.bookchapterversecountById[selectedBookID] ?? {}
		).sort((a, b) => Number(a) - Number(b));
	}

	function chapterSelected(chapter: string): void {
		if (goToVerses) {
			selectedChapter = chapter;
		} else {
			bibleLocationRef = `${selectedBookID}_${chapter}`;
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
		const message = goToVerses ? 'Go to verses enabled' : 'Go to verses disabled';
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
				class="row-span-1 bg-neutral-50 p-4 hover:bg-neutral-100"
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
	<BufferBody {clientHeight} {headerHeight} classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
