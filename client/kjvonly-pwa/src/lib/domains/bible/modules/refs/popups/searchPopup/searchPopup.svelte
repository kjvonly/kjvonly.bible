<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import SearchContainer from '$lib/domains/bible/modules/search/searchContainer.svelte';
	// MODELS
	import type { StrongsPopups } from '$lib/domains/strongs';

	// =============================== BINDINGS ================================
	let { popups = $bindable<StrongsPopups>() }: { popups: StrongsPopups } =
		$props();
</script>

<SearchContainer
	paneID={popups?.searchPopup?.paneID}
	showInput={true}
	searchTerms={popups?.searchPopup?.searchTerms}
	onClose={() => {
		popups.searchPopup = undefined;
	}}
	onFilterBibleLocationRef={popups?.searchPopup
		?.onFilterBibleLocationRefByBookID}
></SearchContainer>
