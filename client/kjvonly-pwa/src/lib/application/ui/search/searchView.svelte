<script lang="ts">
	// SVELTE
	import { onDestroy, onMount, type Snippet } from 'svelte';

	// COMPONENTS
	import SearchInput from '$lib/components/inputs/searchInput.svelte';
	import { KJVAsyncState } from '$lib/components';

	// MODELS
	import type {
		SearchViewResultSummary,
		SearchViewResultsContext
	} from './search-view.model';

	// SESSION
	import { SearchSession } from './search-session.svelte';

	// =============================== BINDINGS ================================

	let {
		initialQuery = '',
		placeholder = 'Search',
		showInput = true,
		focusInputOnMount = true,
		minimumQueryLength = 3,
		debounceMilliseconds = 300,
		resultSummary,
		onSearch,
		onQueryInput,
		results
	}: {
		initialQuery?: string;
		placeholder?: string;
		showInput?: boolean;
		focusInputOnMount?: boolean;
		minimumQueryLength?: number;
		debounceMilliseconds?: number;
		resultSummary?: SearchViewResultSummary;
		onSearch: (query: string) => Promise<void>;
		onQueryInput?: (query: string) => void;
		results: Snippet<[SearchViewResultsContext]>;
	} = $props();

	// ================================= VARS ==================================

	const searchSession = new SearchSession({
		initialQuery: getInitialQuery(),
		minimumQueryLength: getInitialMinimumQueryLength(),
		debounceMilliseconds: getInitialDebounceMilliseconds(),
		onSearch: (query) => onSearch(query),
		onQueryInput: (query) => onQueryInput?.(query)
	});

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		searchSession.start();
	});

	onDestroy(() => {
		searchSession.destroy();
	});

	$effect(() => {
		searchSession.applyResultSummary(resultSummary);
	});

	// ================================ FUNCS ==================================

	function getInitialQuery(): string {
		return initialQuery;
	}

	function getInitialMinimumQueryLength(): number {
		return minimumQueryLength;
	}

	function getInitialDebounceMilliseconds(): number {
		return debounceMilliseconds;
	}
</script>

<div class="flex min-h-0 min-w-0 flex-1 flex-col">
	<div class="z-10 w-full shrink-0 bg-neutral-50">
		{#if showInput}
			<div class="border-t border-neutral-400">
				<SearchInput
					value={searchSession.query}
					{placeholder}
					focusOnMount={focusInputOnMount}
					onInput={(value) => searchSession.handleQueryInput(value)}
				></SearchInput>
			</div>
		{/if}

		{#if searchSession.searchState === 'results' && searchSession.totalResultsCount > 0}
			<div class="py-2 text-center">
				{searchSession.totalResultsCount} {searchSession.totalResultsCount === 1 ? 'result' : 'results'} found
			</div>
		{/if}
	</div>

	{#if searchSession.searchState === 'searching'}
		<KJVAsyncState message="Searching…"></KJVAsyncState>
	{:else if searchSession.searchState === 'no-results'}
		<div class="flex flex-col gap-1 px-4 py-4">
			<div class="text-base">No results</div>
			<div class="text-sm text-neutral-500">Try another search.</div>
		</div>
	{:else if searchSession.searchState === 'failure'}
		<KJVAsyncState
			kind="failure"
			message="Search failed."
			onRetry={() => searchSession.retrySearch()}
		></KJVAsyncState>
	{/if}

	{@render results({
		query: searchSession.query,
		showResults: searchSession.searchState === 'results'
	})}
</div>
