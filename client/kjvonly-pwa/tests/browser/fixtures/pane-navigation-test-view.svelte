<script lang="ts">
	import {
		useNavigationEntryContext
	} from '$lib/application';

	const navigationEntry =
		useNavigationEntryContext();

	let value = $state('');
	let viewID = $derived(
		String(
			navigationEntry
				.navigationState
				.view
		)
	);
</script>

<div data-pane-navigation-view={viewID}>
	<input
		data-pane-navigation-input={viewID}
		bind:value
	/>
</div>
