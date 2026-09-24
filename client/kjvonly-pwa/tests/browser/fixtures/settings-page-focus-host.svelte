<script lang="ts">
	import { newSettings } from '$lib/application/models/settings.model';
	import SettingsPage from '$lib/application/modules/settings/components/settingsPage.svelte';
	import type {
		SettingsPageDefinition,
		SettingsRowID
	} from '$lib/application/modules/settings/models/settings-definition.model';
	import {
		provideSettingsContext
	} from '$lib/application/modules/settings/runtime/settings-context';
	import {
		provideSettingsNavigationContext
	} from '$lib/application/modules/settings/runtime/settings-navigation-context';
	import type {
		SettingsNavigationService
	} from '$lib/application/modules/settings/services/settings-navigation.service';

	let {
		focusRowID
	}: {
		focusRowID?: SettingsRowID;
	} = $props();

	let settings = $state(newSettings());

	provideSettingsContext({
		settings,
		update() {}
	});

	provideSettingsNavigationContext({
		navigate() {}
	} as SettingsNavigationService);

	const page: SettingsPageDefinition = {
		id: 'browser-focus-test',
		title: 'Browser Focus Test',
		sections: [
			{
				id: 'display',
				rows: [
					{
						type: 'toggle',
						id: 'focus-target',
						title: 'Focus Target',
						setting: 'showPericopes'
					}
				]
			}
		]
	};
</script>

<SettingsPage
	{page}
	{focusRowID}
></SettingsPage>
