<script lang="ts">
	// COMPONENTS
	import SearchInput from '$lib/components/inputs/searchInput.svelte';

	// MODELS
	import type {
		SettingsSearchEntry
	} from '../search/settings-search.model';

	// =============================== BINDINGS ================================

	let {
		query,
		results,
		onQueryChange,
		onResultSelect
	}: {
		query: string;
		results: readonly SettingsSearchEntry[];
		onQueryChange: (query: string) => void;
		onResultSelect: (result: SettingsSearchEntry) => void;
	} = $props();

	// ================================= VARS ==================================

	let isSearching = $derived(query.trim().length > 0);
</script>

<SearchInput
	value={query}
	placeholder="Search settings"
	onInput={onQueryChange}
></SearchInput>

{#if isSearching}
	<div class="flex w-full flex-col">
		{#if results.length === 0}
			<div class="px-4 py-6 text-center text-sm text-neutral-500">
				No settings found
			</div>
		{:else}
			{#each results as result (`${result.pageID}:${result.rowID}`)}
				<button
					type="button"
					onclick={() => onResultSelect(result)}
					class="w-full bg-neutral-50 px-4 py-3 text-start text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
				>
					<span class="block font-medium">{result.title}</span>
					<span class="block text-sm text-neutral-500">
						{result.pageTitle}{result.sectionLabel ? ` · ${result.sectionLabel}` : ''}
					</span>
				</button>
			{/each}
		{/if}
	</div>
{/if}
