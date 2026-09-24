<script lang="ts">
	import type {
		NavigationComponentProps
	} from '$lib/application/services/navigation.service';

	let {
		obj = $bindable()
	}: Pick<NavigationComponentProps, 'obj'> = $props();

	let value = $state('');
	let viewID = $derived(
		typeof obj.id === 'string'
			? obj.id
			: 'unknown'
	);
</script>

<div data-navigation-view={viewID}>
	<input
		data-navigation-input={viewID}
		bind:value
	/>
</div>
