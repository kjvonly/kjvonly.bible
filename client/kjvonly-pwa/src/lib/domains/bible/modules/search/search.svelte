<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import SearchInput from './searchInput.svelte';
	import SearchResults from './searchResults.svelte';

	// MODELS
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

	// SERVICES
	import { paneService } from '$lib/application/services/pane.service.svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	// RESOURCE SELECTION
	import { requireResourceSelection } from '$lib/application/resources/resource-selections';
	import { BIBLE_SEARCH_RESOURCE_TYPE } from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

	import type {
		PublishedResourceReference
	} from '$lib/resource/models/resource.model';

	// OTHER
	import uuid4 from 'uuid4';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	const { searchService } =
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
	let searchSource:
		PublishedResourceReference |
		undefined =
			$state();

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		const owningPane =
			pane ??
			paneService.findNode(
				paneService.rootPane,
				paneID
			);

		if (!owningPane) {
			throw new Error(
				`Search Pane not found: ${paneID}`
			);
		}

		searchSource =
			requireResourceSelection(
				owningPane.buffer
					.resourceSelections,
				BIBLE_SEARCH_RESOURCE_TYPE
			);


		if (searchTerms?.length > 0) {
			searchText = searchTerms;
			await searchService.search(
				searchID,
				searchSource,
				searchTerms
			);
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
	{#if showInput && searchSource}
		<SearchInput
			bind:searchText
			ID={searchID}
			{searchSource}
			{onFilterBibleLocationRef}
		></SearchInput>
	{/if}
	<SearchResults
		{paneID}
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
