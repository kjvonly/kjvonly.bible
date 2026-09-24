<script lang="ts">
	// COMPONENTS
	import Search from '$lib/components/svgs/search.svelte';

	// MODELS
	import type {
		SettingsSearchEntry
	} from '../search/settings-search.model';

	// =============================== BINDINGS ================================

	let {
		query = $bindable(),
		results,
		onResultSelect
	}: {
		query: string;
		results: readonly SettingsSearchEntry[];
		onResultSelect: (result: SettingsSearchEntry) => void;
	} = $props();

	// ================================= VARS ==================================

	let isSearching = $derived(query.trim().length > 0);
</script>

<div class="w-full px-4 py-3">
	<label class="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700 focus-within:ring-2 focus-within:ring-primary-500">
		<Search classes="h-5 w-5 shrink-0 text-neutral-500"></Search>
		<span class="sr-only">Search settings</span>
		<input
			type="search"
			placeholder="Search settings"
			bind:value={query}
			class="min-w-0 flex-1 border-none bg-transparent p-0 text-neutral-700 outline-none placeholder:text-neutral-500 focus:outline-none focus:ring-0"
		/>
	</label>
</div>

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
