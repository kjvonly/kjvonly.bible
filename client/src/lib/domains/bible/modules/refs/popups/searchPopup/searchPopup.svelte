<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Search from '$lib/domains/bible/modules/search/search.svelte';
	// MODELS
	import type { StrongsPopups } from '$lib/domains/bible/models/strongs.model';

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
