<script lang="ts">
	import {
		provideApplicationContext,
		type ApplicationContext
	} from '$lib/application/runtime/application-context';
	import NavigationContainer from '$lib/application/runtime/navigation/components/navigationContainer.svelte';
	import type {
		NavigationService
	} from '$lib/application/services/navigation.service';
	import {
		SettingsService
	} from '$lib/application/services/settings.service';

	let {
		navService
	}: {
		navService: NavigationService;
	} = $props();

	provideApplicationContext({
		settingsService: new SettingsService()
	} as ApplicationContext);
</script>

<NavigationContainer
	paneID="navigation-test-pane"
	{navService}
></NavigationContainer>
