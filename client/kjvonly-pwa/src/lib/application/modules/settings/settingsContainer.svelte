<script lang="ts">
	// ================================ IMPORTS ================================

	// SVELTE
	import { onMount } from 'svelte';

	// THIRD PARTY
	import uuid4 from 'uuid4';

	// APPLICATION
	import { useApplicationContext } from '../../runtime/application-context';
	import type { Pane } from '../../runtime/pane/models/pane.model';
	import type { Settings } from '../../models/settings.model';
	import type { SettingsContext } from './runtime/settings-context';

	// COMPONENTS
	import NavigationContainer from '../../runtime/navigation/components/navigationContainer.svelte';
	import SettingsView from './settings.svelte';
	import SettingsChoicePage from './settingsChoicePage.svelte';
	import SettingsCustomPage from './settingsCustomPage.svelte';
	import SettingsGroupPage from './settingsGroupPage.svelte';

	// RUNTIME
	import { provideSettingsContext } from './runtime/settings-context';
	import { provideSettingsNavigationContext } from './runtime/settings-navigation-context';

	// SERVICES
	import { SettingsNavigationService } from './services/settings-navigation.service';

	// =============================== BINDINGS ================================

	let {
		paneID,
		pane = $bindable<Pane>(),
		onClose
	}: {
		paneID: string;
		pane?: Pane;
		onClose?: () => void;
	} = $props();

	// ================================= VARS ==================================

	const {
		navigationServiceFactory,
		settingsService,
		workspaceRuntime
	} = useApplicationContext();
	let navService = navigationServiceFactory.create();
	let settingsNavigationService = new SettingsNavigationService(
		navService,
		{
			group: SettingsGroupPage,
			select: SettingsChoicePage,
			custom: SettingsCustomPage
		}
	);
	let settings = $state(settingsService.getSettings());
	let settingsSubscriberID = uuid4();

	const settingsContext: SettingsContext = {
		settings,
		update: updateSetting
	};

	provideSettingsContext(settingsContext);
	provideSettingsNavigationContext(settingsNavigationService);

	// ================================ FUNCS ==================================

	/**
	 * Persist a user-initiated setting change through the application service.
	 * The service broadcast refreshes this module and every other mounted
	 * Settings module with the normalized persisted value.
	 */
	function updateSetting<K extends keyof Settings>(
		setting: K,
		value: Settings[K]
	): void {
		settingsService.updateSetting(
			setting,
			value
		);
	}

	/**
	 * Refresh this module's reactive Settings object without persisting again.
	 * This prevents subscriber updates from creating a publish loop.
	 */
	function onSettingsChange(
		updatedSettings: Settings
	): void {
		Object.assign(
			settingsContext.settings,
			updatedSettings
		);
	}

	function closeSettings(): void {
		if (onClose) {
			onClose();
			return;
		}

		workspaceRuntime.closePane(paneID);
	}

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		settingsService.subscribe(
			settingsSubscriberID,
			onSettingsChange
		);

		onSettingsChange(
			settingsService.getSettings()
		);

		navService.push({
			component: SettingsView,
			obj: {
				onClose: closeSettings
			}
		});

		return () => {
			settingsService.unsubscribe(
				settingsSubscriberID
			);
		};
	});
</script>

<!-- ============================== CONTAINER ============================== -->

<NavigationContainer {paneID} {navService}></NavigationContainer>
