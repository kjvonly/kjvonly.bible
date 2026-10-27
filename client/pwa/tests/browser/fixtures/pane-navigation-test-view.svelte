<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		useNavigationEntryContext
	} from '$lib/application';

	const navigationEntry =
		useNavigationEntryContext();

	let activations = $state(0);
	const unsubscribeActivation = navigationEntry.onActivation(() => { activations += 1; });
	onDestroy(unsubscribeActivation);

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
	<span data-pane-navigation-activations={viewID}>{activations}</span>
	<input
		data-pane-navigation-input={viewID}
		bind:value
	/>
</div>
