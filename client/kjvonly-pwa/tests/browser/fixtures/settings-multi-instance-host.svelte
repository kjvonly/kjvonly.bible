<script lang="ts">
	import {
		provideApplicationContext,
		type ApplicationContext
	} from '$lib/application/runtime/application-context';
	import SettingsContainer from '$lib/application/modules/settings/settingsContainer.svelte';
	import {
		NavigationServiceFactory
	} from '$lib/application/services/navigation-service-factory';
	import {
		SettingsService
	} from '$lib/application/services/settings.service';

	const settingsService =
		new SettingsService();

	provideApplicationContext({
		settingsService,
		navigationServiceFactory:
			new NavigationServiceFactory()
	} as ApplicationContext);
</script>

<div data-settings-instance="first">
	<SettingsContainer
		paneID="settings-first"
		onClose={() => {}}
	></SettingsContainer>
</div>

<div data-settings-instance="second">
	<SettingsContainer
		paneID="settings-second"
		onClose={() => {}}
	></SettingsContainer>
</div>
