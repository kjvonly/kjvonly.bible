<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import SearchInput from './searchInput.svelte';
	import SearchResults from './searchResults.svelte';

	// MODELS
	import type { Pane } from '$lib/models/pane.model';

	// SERVICES
	import { paneService } from '$lib/services/pane.service.svelte';
	import { searchService } from '$lib/services/search.service';

	// OTHER
	import uuid4 from 'uuid4';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID = $bindable<string>(),
		pane = $bindable<Pane>(),
		showInput = true,
		searchTerms,
		onClose = undefined,
		onFilterBibleLocationRef = undefined
	} = $props();

	// ================================= VARS ==================================

	// DOM vars
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	// component vars
	let searchID: string = uuid4();
	let searchText = $state('');
	let bibleVersion = $state('kjvs');

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		if (searchTerms?.length > 0) {
			searchText = searchTerms;
			searchService.search(searchID, searchTerms);
		}
	});

	function applyOnClose() {
		if (onClose) {
			onClose();
		} else {
			paneService.onDeletePane(paneService.rootPane, paneID);
		}
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<div class="flex w-full items-center justify-between">
		<span class="flex-1"></span>
		<span class="text-center">Search</span>
		<div class="flex flex-1 justify-end">
			<KJVButton classes="" onClick={applyOnClose}>
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#if showInput}
		<SearchInput
			bind:bibleVersion
			bind:searchText
			ID={searchID}
			{onFilterBibleLocationRef}
		></SearchInput>
	{/if}
	<SearchResults
		{paneID}
		bind:bibleVersion
		bind:searchText
		{searchID}
		{onFilterBibleLocationRef}
	></SearchResults>

	<div class="h-6"></div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>

	<BufferBody ID={searchID} bind:headerHeight bind:clientHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
