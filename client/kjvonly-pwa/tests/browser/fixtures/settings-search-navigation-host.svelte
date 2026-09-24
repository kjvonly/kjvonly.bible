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

	provideApplicationContext({
		settingsService:
			new SettingsService(),
		navigationServiceFactory:
			new NavigationServiceFactory()
	} as ApplicationContext);
</script>

<SettingsContainer
	paneID="settings-search-test"
	onClose={() => {}}
></SettingsContainer>
