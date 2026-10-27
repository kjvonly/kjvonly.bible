<script lang="ts">
	import {
		provideApplicationContext,
		type ApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		SettingsService
	} from '$lib/application/services/settings.service';

	import SettingsNavigationTestPane from './settings-navigation-test-pane.svelte';

	provideApplicationContext({
		settingsService:
			new SettingsService()
	} as ApplicationContext);
</script>

<SettingsNavigationTestPane
	paneID="settings-search-test"
></SettingsNavigationTestPane>
