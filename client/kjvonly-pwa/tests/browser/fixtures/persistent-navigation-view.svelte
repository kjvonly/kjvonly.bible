<script lang="ts">
	import {
		useNavigationEntryContext
	} from '$lib/application';

	const navigationEntry =
		useNavigationEntryContext();

	let value = $state('');
	let viewID = $derived(
		typeof navigationEntry.navigationState
			.state.id === 'string'
			? navigationEntry.navigationState
				.state.id
			: 'unknown'
	);
</script>

<div data-navigation-view={viewID}>
	<input
		data-navigation-input={viewID}
		bind:value
	/>
</div>
