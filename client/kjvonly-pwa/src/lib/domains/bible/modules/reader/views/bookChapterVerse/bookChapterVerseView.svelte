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
	} from '../../../../models/bible-booknames.model';

	// SERVICES
	import {
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '../../../../resources/booknames/bible-booknames-interpreter';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	let {
		clientHeight: _clientHeight,
		obj: _obj
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	void _clientHeight;
	void _obj;

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
					navigationState,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

		booknames =
			await bibleBooknamesService
				.get(
					source
				);
	}

	async function onLocationSelected(
		bibleLocationRef: string
	): Promise<void> {
		await navigation.backWithResult({
			type: 'bible-location',
			bibleLocationRef
		});
	}
</script>

{#if booknames}
	{#if !selectedBookID}
		<Books
			{booknames}
			bind:selectedBookID
			onClose={() => navigation.back()}
		></Books>
	{:else if selectedChapter}
		<Verses
			{booknames}
			bind:selectedChapter
			{selectedBookID}
			{onLocationSelected}
		></Verses>
	{:else}
		<Chapters
			{booknames}
			bind:selectedBookID
			bind:selectedChapter
			bind:goToVerses
			{onLocationSelected}
		></Chapters>
	{/if}
{/if}
