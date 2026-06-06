<script lang="ts">
	// ================================ IMPORTS ================================
	// SERVICES
	import { searchService } from '$lib/services/search.service';

	// =============================== BINDINGS ================================

	let {
		searchText = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		ID,
		onFilterBibleLocationRef
	} = $props();

	// ================================ FUNCS ==================================
	function onSearchTextChanged() {
		onFilterBibleLocationRef = undefined;
		if (searchText.length > 2) {
			console.log(searchText);
			searchService.search(ID, searchText);
		}
	}
</script>

<div
	class="sticky top-0 flex w-full max-w-lg justify-center border-t border-neutral-400 bg-neutral-50 py-2"
>
	<input
		class="border-primary-500 w-full max-w-3xl border-b bg-neutral-50 outline-none"
		oninput={onSearchTextChanged}
		bind:value={searchText}
		placeholder="search"
	/>
</div>
