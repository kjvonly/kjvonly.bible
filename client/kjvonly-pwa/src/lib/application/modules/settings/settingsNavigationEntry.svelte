<script lang="ts">
	import {
		onMount,
		type Component
	} from 'svelte';
	import uuid4 from 'uuid4';

	// APPLICATION
	import {
		useApplicationContext
	} from '../../runtime/application-context';
	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';
	import type {
		Settings
	} from '../../models/settings.model';

	// COMPONENTS
	import SettingsView from './settings.svelte';
	import SettingsChoicePage from './settingsChoicePage.svelte';
	import SettingsCustomPage from './settingsCustomPage.svelte';
	import SettingsGroupPage from './settingsGroupPage.svelte';

	// MODELS
	import {
		SETTINGS_VIEWS,
		type SettingsView as SettingsViewID
	} from './models/settings-navigation.model';

	// RUNTIME
	import {
		provideSettingsContext,
		type SettingsContext
	} from './runtime/settings-context';
	import {
		provideSettingsNavigationContext
	} from './runtime/settings-navigation-context';

	// SERVICES
	import {
		SettingsNavigationService
	} from './services/settings-navigation.service';

	// =============================== BINDINGS ================================

	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================= VARS ==================================

	const {
		settingsService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	let settings = $state(
		settingsService.getSettings()
	);

	const settingsSubscriberID = uuid4();

	const settingsContext: SettingsContext = {
		settings,
		update: updateSetting
	};

	provideSettingsContext(
		settingsContext
	);

	provideSettingsNavigationContext(
		new SettingsNavigationService(
			navigation
		)
	);

	const ViewComponent =
		resolveViewComponent(
			navigationState.view
		);

	// ================================ FUNCS ==================================

	function updateSetting<
		K extends keyof Settings
	>(
		setting: K,
		value: Settings[K]
	): void {
		settingsService.updateSetting(
			setting,
			value
		);
	}

	function onSettingsChange(
		updatedSettings: Settings
	): void {
		Object.assign(
			settingsContext.settings,
			updatedSettings
		);
	}

	function resolveViewComponent(
		view: string | number
	): Component<{
		clientHeight: number;
	}> {
		switch (view as SettingsViewID) {
			case SETTINGS_VIEWS.ROOT:
				return SettingsView;
			case SETTINGS_VIEWS.GROUP:
				return SettingsGroupPage;
			case SETTINGS_VIEWS.SELECT:
				return SettingsChoicePage;
			case SETTINGS_VIEWS.CUSTOM:
				return SettingsCustomPage;
			default:
				throw new Error(
					`Unsupported Settings navigation view: ${String(view)}`
				);
		}
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

		return () => {
			settingsService.unsubscribe(
				settingsSubscriberID
			);
		};
	});
</script>

<ViewComponent {clientHeight}></ViewComponent>
