<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import { BufferBody } from '$lib/application/ui';
	import { BufferContainer } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';
	import Close from '$lib/components/svgs/close.svelte';
	import SearchInput from './searchInput.svelte';
	import SearchResults from './searchResults.svelte';

	// MODELS
	import type { Pane } from '$lib/application';

	// SERVICES
	import { useApplicationContext } from '$lib/application';

	import { BIBLE_SEARCH_RESOURCE_TYPE } from '../../resources/search/bible-search-index-interpreter';

	import type { PublishedResourceReference } from '$lib/resource';

	// OTHER
	import uuid4 from 'uuid4';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	const { workspaceRuntime } = useApplicationContext();

	const { searchService, moduleResourceSelectionResolver } =
		useApplicationContext();

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
	let searchSource: PublishedResourceReference | undefined = $state();

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		searchSource = moduleResourceSelectionResolver.require(
			paneID,
			BIBLE_SEARCH_RESOURCE_TYPE
		);

		if (searchTerms?.length > 0) {
			searchText = searchTerms;
			await searchService.search(searchID, searchSource, searchTerms);
		}
	});

	function applyOnClose() {
		if (onClose) {
			onClose();
		} else {
			workspaceRuntime.closePane(paneID);
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
	{#if showInput && searchSource}
		<SearchInput
			bind:searchText
			ID={searchID}
			{searchSource}
			{onFilterBibleLocationRef}
		></SearchInput>
	{/if}
	<SearchResults {paneID} bind:searchText {searchID} {onFilterBibleLocationRef}
	></SearchResults>
	<div class="h-6"></div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>

	<BufferBody ID={searchID} bind:headerHeight bind:clientHeight classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
