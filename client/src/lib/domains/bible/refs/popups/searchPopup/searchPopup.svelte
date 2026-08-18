<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Search from '$lib/modules/search/search.svelte';
	// MODELS
	import type { StrongsPopups } from '$lib/models/strongs.model';

	// =============================== BINDINGS ================================
	let { popups = $bindable<StrongsPopups>() }: { popups: StrongsPopups } =
		$props();
</script>

<Search
	paneID={popups?.searchPopup?.paneID}
	showInput={true}
	searchTerms={popups?.searchPopup?.searchTerms}
	onClose={() => {
		popups.searchPopup = undefined;
	}}
	onFilterBibleLocationRef={popups?.searchPopup
		?.onFilterBibleLocationRefByBookID}
></Search>
