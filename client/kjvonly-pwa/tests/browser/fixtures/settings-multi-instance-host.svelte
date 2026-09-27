<script lang="ts">
	import {
		provideApplicationContext,
		type ApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		SettingsService
	} from '$lib/application/services/settings.service';

	import SettingsNavigationTestPane from './settings-navigation-test-pane.svelte';

	const settingsService =
		new SettingsService();

	provideApplicationContext({
		settingsService
	} as ApplicationContext);
</script>

<div data-settings-instance="first">
	<SettingsNavigationTestPane
		paneID="settings-first"
	></SettingsNavigationTestPane>
</div>

<div data-settings-instance="second">
	<SettingsNavigationTestPane
		paneID="settings-second"
	></SettingsNavigationTestPane>
</div>
