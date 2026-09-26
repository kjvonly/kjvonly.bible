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
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import type {
		onFilterBibleLocationRefFunction,
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

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================

	let {
		clientHeight: entryClientHeight = 0,
		obj = {},
		showInput = true,
		searchTerms = '',
		placeholder = 'Search',
		onClose = undefined,
		onFilterBibleLocationRef = undefined,
		resourceNavigationState = undefined
	}: {
		clientHeight?: number;
		obj?: Record<string, unknown>;
		showInput?: boolean;
		searchTerms?: string;
		placeholder?: string;
		onClose?: (() => void) | undefined;
		onFilterBibleLocationRef?: onFilterBibleLocationRefFunction | undefined;
		resourceNavigationState?: NavigationState;
	} = $props();

	const navigationState =
		getNavigationState(obj);

	const selectionNavigationState =
		navigationState ?? resourceNavigationState;

	if (!selectionNavigationState) {
		throw new Error(
			'Search Resource navigation state is required'
		);
	}

	const initialSearchTerms =
		getInitialSearchTerms();

	// ================================= VARS ==================================

	// DOM vars
	let legacyClientHeight = $state(0);
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
		const searchSource =
			moduleResourceSelectionResolver.require(
				selectionNavigationState,
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

		if (navigationState) {
			navigation.updateViewState(
				navigationState,
				'query',
				value
			);
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

	function applyOnClose(): void {
		if (onClose) {
			onClose();
			return;
		}

		navigation.back();
	}

	function getInitialSearchTerms(): string {
		const query = navigationState?.state.query;

		return typeof query === 'string'
			? query
			: searchTerms;
	}

	function getNavigationState(
		value: unknown
	): NavigationState<typeof SEARCH_VIEWS.RESULTS> | undefined {
		if (!isRecord(value)) {
			return undefined;
		}

		const candidate = value.navigationState;

		if (candidate === undefined) {
			return undefined;
		}

		validateNavigationState(candidate);
		return candidate;
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
		resourceNavigationState={selectionNavigationState}
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

{#snippet content(clientHeight: number)}
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>

	<BufferBody ID={searchID} {headerHeight} {clientHeight} classes="">
		{@render body()}
	</BufferBody>
{/snippet}

{#if navigationState}
	{@render content(entryClientHeight)}
{:else}
	<BufferContainer bind:clientHeight={legacyClientHeight}>
		{@render content(legacyClientHeight)}
	</BufferContainer>
{/if}
