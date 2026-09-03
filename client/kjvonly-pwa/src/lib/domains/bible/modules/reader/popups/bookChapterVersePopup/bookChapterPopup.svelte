<script lang="ts">
	// ================================ IMPORTS ================================

	// COMPONENTS
	import Books from './books.svelte';
	import Chapters from './chapters.svelte';
	import Verses from './verses.svelte';

	// =============================== BINDINGS ================================

	let { bibleLocationRef = $bindable(), showBookChapterPopup = $bindable() } =
		$props();

	// ================================== VARS =================================

	let selectedBookID: string = $state('');
	let selectedChapter: string = $state('');
	let goToVerses: boolean = $state(false);
</script>

{#if !selectedBookID}
	<Books bind:selectedBookID bind:showBookChapterPopup></Books>
{:else if selectedChapter}
	<Verses
		bind:showBookChapterPopup
		bind:bibleLocationRef
		bind:selectedChapter
		{selectedBookID}
	></Verses>
{:else}
	<Chapters
		bind:selectedBookID
		bind:selectedChapter
		bind:bibleLocationRef
		bind:showBookChapterPopup
		bind:goToVerses
	></Chapters>
{/if}
