<script lang="ts">
	import type {
		NavigationState
	} from '$lib/application/services/navigation.service';

	let {
		obj
	}: {
		obj: {
			navigationState: NavigationState;
		};
	} = $props();

	let value = $state('');
	let viewID = $derived(
		String(
			obj.navigationState.view
		)
	);
</script>

<div data-pane-navigation-view={viewID}>
	<input
		data-pane-navigation-input={viewID}
		bind:value
	/>
</div>
