<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import SearchContainer from '../../../search/searchContainer.svelte';
	// MODELS
	import type { NavigationState } from '$lib/application';
	import type { StrongsPopups } from '$lib/domains/strongs';

	// =============================== BINDINGS ================================
	let {
		popups = $bindable<StrongsPopups>(),
		navigationState
	}: {
		popups: StrongsPopups;
		navigationState: NavigationState;
	} = $props();
</script>

<SearchContainer
	resourceNavigationState={navigationState}
	showInput={true}
	searchTerms={popups?.searchPopup?.searchTerms}
	onClose={() => {
		popups.searchPopup = undefined;
	}}
	onFilterBibleLocationRef={popups?.searchPopup
		?.onFilterBibleLocationRefByBookID}
></SearchContainer>
