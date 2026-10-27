<script lang="ts">
	import type {
		ApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		provideApplicationContext
	} from '$lib/application/runtime/application-context';
	import PaneNavigationContainer from '$lib/application/runtime/navigation/components/paneNavigationContainer.svelte';
	import type {
		PaneNavigationService
	} from '$lib/application/services/pane-navigation.service';
	import {
		SettingsService
	} from '$lib/application/services/settings.service';

	let {
		navigation
	}: {
		navigation: PaneNavigationService;
	} = $props();

	provideApplicationContext({
		settingsService:
			new SettingsService()
	} as ApplicationContext);
</script>

<PaneNavigationContainer {navigation}></PaneNavigationContainer>
