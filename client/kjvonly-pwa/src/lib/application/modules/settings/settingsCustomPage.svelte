<script lang="ts">
	// COMPONENTS
	import SettingsScreen from './components/settingsScreen.svelte';

	// MODELS
	import type { NavigationComponentProps } from '../../services/navigation.service';

	// RESOLVERS
	import { resolveSettingsCustomViewComponent } from './resolvers/settings-custom-view-component-resolver';
	import { requireSettingsCustomRow } from './resolvers/settings-definition-resolver';

	// RUNTIME
	import { useSettingsNavigationContext } from './runtime/settings-navigation-context';

	// =============================== BINDINGS ================================

	let {
		clientHeight,
		obj = $bindable(),
		navService = $bindable()
	}: NavigationComponentProps = $props();

	// ================================= VARS ==================================

	let settingsNavigation = useSettingsNavigationContext();
	let row = $derived.by(() => {
		const rowID = obj.rowID;

		if (typeof rowID !== 'string') {
			throw new Error('Settings custom navigation requires a rowID.');
		}

		return requireSettingsCustomRow(rowID);
	});

	// ================================ FUNCS ==================================

	function onBack(event: Event): void {
		event.stopPropagation();
		settingsNavigation.back();
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<SettingsScreen title={row.title} {clientHeight} {onBack}>
	{@const CustomComponent = resolveSettingsCustomViewComponent(row.view)}
	<CustomComponent></CustomComponent>
</SettingsScreen>
