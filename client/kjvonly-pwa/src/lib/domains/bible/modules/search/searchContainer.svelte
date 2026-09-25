<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import {
		BufferBody,
		BufferContainer,
		BufferHeader,
		SearchView,
		type SearchAdapter,
		type SearchViewResultSummary,
		type SearchViewResultsContext
	} from '$lib/application/ui';
	import { KJVHeader } from '$lib/components/header';
	import { BibleSearchAdapter } from './bible-search-adapter';
	import SearchResults from './searchResults.svelte';

	// MODELS
	import type { Pane } from '$lib/application';
	import type {
		onFilterBibleLocationRefFunction,
		SearchResultResponse
	} from '../../models/search.model';

	// SERVICES
	import { useApplicationContext } from '$lib/application';

	import { BIBLE_SEARCH_RESOURCE_TYPE } from '../../resources/search/bible-search-index-interpreter';

	// OTHER
	import uuid4 from 'uuid4';
	const { workspaceRuntime } = useApplicationContext();

	const { searchService, moduleResourceSelectionResolver } =
		useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID = $bindable<string>(),
		pane = $bindable<Pane>(),
		showInput = true,
		searchTerms = '',
		placeholder = 'Search',
		onClose = undefined,
		onFilterBibleLocationRef = undefined
	} = $props();

	// ================================= VARS ==================================

	// DOM vars
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	// component vars
	let searchID: string = uuid4();
	let searchAdapter: SearchAdapter<SearchResultResponse> | undefined = $state();
	let searchResponse: SearchResultResponse | undefined = $state();
	let searchResultSummary: SearchViewResultSummary | undefined = $state();
	let useInitialFilter = $state(true);

	let activeSearchQuery = '';
	let activeSearchFilter: onFilterBibleLocationRefFunction | undefined;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		const searchSource = moduleResourceSelectionResolver.require(
			paneID,
			BIBLE_SEARCH_RESOURCE_TYPE
		);

		searchAdapter = new BibleSearchAdapter(
			searchService,
			searchID,
			searchSource
		);

		return searchAdapter.subscribe(handleSearchResult);
	});

	// ================================ FUNCS ==================================

	function handleQueryInput(value: string): void {
		activeSearchQuery = value;
		activeSearchFilter = undefined;
		searchResponse = undefined;
		searchResultSummary = undefined;
		useInitialFilter = false;
	}

	function runSearch(value: string): Promise<void> {
		if (!searchAdapter) {
			return Promise.resolve();
		}

		activeSearchQuery = value;
		activeSearchFilter = useInitialFilter
			? onFilterBibleLocationRef
			: undefined;
		searchResponse = undefined;
		searchResultSummary = undefined;

		return searchAdapter.search(value);
	}

	function handleSearchResult(response: SearchResultResponse): void {
		if (response.text !== activeSearchQuery) {
			return;
		}

		const bibleLocationRefs = [...response.bibleLocationRefs];

		searchResponse = {
			...response,
			bibleLocationRefs: activeSearchFilter
				? activeSearchFilter(bibleLocationRefs)
				: bibleLocationRefs
		};
	}

	function handleRenderedResultsChanged(
		query: string,
		renderedCount: number,
		totalCount: number
	): void {
		if (query !== activeSearchQuery) {
			return;
		}

		searchResultSummary = {
			query,
			renderedCount,
			totalCount
		};
	}

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
	<KJVHeader
		title="Search"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Close search',
			onClick: applyOnClose
		}}
		actions={[
			{
				icon: 'more-vertical',
				label: 'More actions',
				onClick: () => {}
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ============================ SEARCH RESULTS =========================== -->

{#snippet searchResults(search: SearchViewResultsContext)}
	<SearchResults
		{paneID}
		searchText={search.query}
		scrollContainerID={searchID}
		{searchResponse}
		showResults={search.showResults}
		onRenderedCountChanged={handleRenderedResultsChanged}
	></SearchResults>
	<div class="h-6"></div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#if searchAdapter}
		<SearchView
			initialQuery={searchTerms}
			{showInput}
			{placeholder}
			resultSummary={searchResultSummary}
			onSearch={runSearch}
			onQueryInput={handleQueryInput}
			results={searchResults}
		></SearchView>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>

	<BufferBody ID={searchID} {headerHeight} {clientHeight} classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
