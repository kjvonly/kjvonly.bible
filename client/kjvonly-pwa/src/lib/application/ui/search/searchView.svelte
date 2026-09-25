<script lang="ts">
	// SVELTE
	import { onDestroy, onMount, type Snippet } from 'svelte';

	// COMPONENTS
	import SearchInput from '$lib/components/inputs/searchInput.svelte';

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

<div class="sticky top-0 z-10 w-full bg-neutral-50">
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
			Showing {searchSession.renderedResultsCount} of {searchSession.totalResultsCount}
		</div>
	{/if}
</div>

{#if searchSession.searchState === 'searching'}
	<div class="px-4 py-4 text-sm text-neutral-500" role="status" aria-live="polite">
		Searching…
	</div>
{:else if searchSession.searchState === 'no-results'}
	<div class="flex flex-col gap-1 px-4 py-4">
		<div class="text-base">No results</div>
		<div class="text-sm text-neutral-500">Try another search.</div>
	</div>
{:else if searchSession.searchState === 'failure'}
	<div class="flex flex-col gap-4 px-4 py-4" role="alert">
		<div class="text-base">Search failed.</div>
		<button
			type="button"
			class="min-h-[44px] self-start rounded-lg bg-primary-500 px-4 text-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
			onclick={() => searchSession.retrySearch()}
		>
			Retry
		</button>
	</div>
{/if}

{@render results({
	query: searchSession.query,
	showResults: searchSession.searchState === 'results'
})}
