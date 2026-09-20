<script lang="ts">
	// ================================ IMPORTS ================================
	// SERVICES
	import { useApplicationContext } from '$lib/application';

	const { searchService } = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		searchText = $bindable<string>(),
		ID,
		searchSource,
		onFilterBibleLocationRef
	} = $props();

	// ================================ FUNCS ==================================
	function onSearchTextChanged() {
		onFilterBibleLocationRef = undefined;
		if (searchText.length > 2) {
			searchService.search(ID, searchSource, searchText);
		}
	}
</script>

<div
	class="sticky top-0 flex w-full justify-center border-t border-neutral-400 bg-neutral-50 px-4 py-2"
>
	<input
		class="border-primary-500 w-full border-b bg-neutral-50 outline-none"
		oninput={onSearchTextChanged}
		bind:value={searchText}
		placeholder="search"
	/>
</div>
