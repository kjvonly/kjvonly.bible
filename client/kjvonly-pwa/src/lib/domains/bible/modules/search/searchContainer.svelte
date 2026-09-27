<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import {
		ViewBody,
		ViewHeader,
		SearchView,
		type SearchAdapter,
		type SearchViewResultSummary,
		type SearchViewResultsContext
	} from '$lib/application/ui';
	import { KJVHeader } from '$lib/components/header';
	import { BibleSearchAdapter } from './bible-search-adapter';
	import SearchResults from './searchResults.svelte';

	// MODELS
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import type {
		SearchResultResponse
	} from '../../models/search.model';
	import {
		SEARCH_VIEWS
	} from '../../models/search-navigation.model';

	// SERVICES
	const {
		searchService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	import { BIBLE_SEARCH_RESOURCE_TYPE } from '../../resources/search/bible-search-index-interpreter';
	import { filterBibleLocationRefsByBookID } from './search-filter';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState,
		updateState
	} = useNavigationEntryContext();

	validateNavigationState(
		navigationState
	);

	const initialSearchTerms =
		getInitialSearchTerms();

	// ================================= VARS ==================================

	// DOM vars
	let headerHeight = $state(0);

	// component vars
	let searchID: string = uuid4();
	let searchAdapter: SearchAdapter<SearchResultResponse> | undefined = $state();
	let searchResponse: SearchResultResponse | undefined = $state();
	let searchResultSummary: SearchViewResultSummary | undefined = $state();
	let activeSearchQuery = '';
	let activeBookID: number | undefined;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		const searchSource =
			moduleResourceSelectionResolver.require(
				navigationState,
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
		activeBookID = undefined;
		searchResponse = undefined;
		searchResultSummary = undefined;

		if (navigationState.state.bookID !== undefined) {
			updateState(
				'bookID',
				undefined
			);
		}
	}

	function runSearch(value: string): Promise<void> {
		if (!searchAdapter) {
			return Promise.resolve();
		}

		updateState(
			'query',
			value
		);

		activeSearchQuery = value;
		activeBookID = getBookID();
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
			bibleLocationRefs: activeBookID !== undefined
				? filterBibleLocationRefsByBookID(
					bibleLocationRefs,
					activeBookID
				)
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

	function applyOnClose(): void {
		navigation.back();
	}

	function getInitialSearchTerms(): string {
		const query = navigationState.state.query;

		return typeof query === 'string'
			? query
			: '';
	}

	function getBookID(): number | undefined {
		const bookID = navigationState.state.bookID;

		return typeof bookID === 'number'
			? bookID
			: undefined;
	}

	function validateNavigationState(
		value: unknown
	): asserts value is NavigationState<typeof SEARCH_VIEWS.RESULTS> {
		if (
			!isRecord(value) ||
			value.module !== Modules.SEARCH ||
			value.view !== SEARCH_VIEWS.RESULTS ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Search navigation state'
			);
		}

		if (
			value.state.query !== undefined &&
			typeof value.state.query !== 'string'
		) {
			throw new Error(
				'Invalid Search query navigation state'
			);
		}

		if (
			value.state.bookID !== undefined &&
			typeof value.state.bookID !== 'number'
		) {
			throw new Error(
				'Invalid Search book navigation state'
			);
		}
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		);
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
		resourceNavigationState={navigationState}
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
			initialQuery={initialSearchTerms}
			resultSummary={searchResultSummary}
			onSearch={runSearch}
			onQueryInput={handleQueryInput}
			results={searchResults}
		></SearchView>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{#snippet content(clientHeight: number)}
	<ViewHeader bind:headerHeight>
		{@render header()}
	</ViewHeader>

	<ViewBody ID={searchID} {headerHeight} {clientHeight} classes="">
		{@render body()}
	</ViewBody>
{/snippet}

{@render content(clientHeight)}
