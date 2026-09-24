<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import NavigationContainer from '$lib/application/runtime/navigation/components/navigationContainer.svelte';
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import Profile from './profile/profile.svelte';

	// =============================== BINDINGS ================================
	let { paneID, pane = $bindable() } = $props();

	// ================================== VARS =================================

	const { navigationServiceFactory } = useApplicationContext();
	let navService = navigationServiceFactory.create();

	onMount(() => {
		navService.push({ component: Profile, obj: {} });
	});
</script>

<!-- ============================== CONTAINER ============================== -->
<NavigationContainer {paneID} {navService}></NavigationContainer>
