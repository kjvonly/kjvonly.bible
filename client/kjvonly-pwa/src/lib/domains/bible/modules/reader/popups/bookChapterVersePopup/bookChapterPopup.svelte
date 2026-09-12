<script lang="ts">
	// ================================ IMPORTS ================================

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import Books from './books.svelte';
	import Chapters from './chapters.svelte';
	import Verses from './verses.svelte';

	// MODELS
	import type {
		BibleBooknames
	} from '$lib/domains/bible/models/bible-booknames.model';

	// SERVICES
	import {
		useApplicationContext
	} from '$lib/application/runtime/application-context';

	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID,
		bibleLocationRef = $bindable(),
		showBookChapterPopup = $bindable()
	}: {
		paneID: string;
		bibleLocationRef: string;
		showBookChapterPopup: boolean;
	} = $props();

	// ================================== VARS =================================

	let selectedBookID: string = $state('');
	let selectedChapter: string = $state('');
	let goToVerses: boolean = $state(false);

	let booknames:
		BibleBooknames |
		undefined = $state();

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void loadBooknames();
	});

	// ================================ FUNCS ==================================

	async function loadBooknames():
		Promise<void> {
		const source =
			moduleResourceSelectionResolver
				.require(
					paneID,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

		booknames =
			await bibleBooknamesService
				.get(
					source
				);
	}
</script>

{#if booknames}
	{#if !selectedBookID}
		<Books
			{booknames}
			bind:selectedBookID
			bind:showBookChapterPopup
		></Books>
	{:else if selectedChapter}
		<Verses
			{booknames}
			bind:showBookChapterPopup
			bind:bibleLocationRef
			bind:selectedChapter
			{selectedBookID}
		></Verses>
	{:else}
		<Chapters
			{booknames}
			bind:selectedBookID
			bind:selectedChapter
			bind:bibleLocationRef
			bind:showBookChapterPopup
			bind:goToVerses
		></Chapters>
	{/if}
{/if}
