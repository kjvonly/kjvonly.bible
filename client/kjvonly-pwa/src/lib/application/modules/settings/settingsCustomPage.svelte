<script lang="ts">
	// COMPONENTS
	import SettingsScreen from './components/settingsScreen.svelte';

	// RESOLVERS
	import { resolveSettingsCustomViewComponent } from './resolvers/settings-custom-view-component-resolver';
	import { requireSettingsCustomRow } from './resolvers/settings-definition-resolver';

	// RUNTIME
	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';
	import { useSettingsNavigationContext } from './runtime/settings-navigation-context';

	// =============================== BINDINGS ================================

	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================= VARS ==================================

	const settingsNavigation = useSettingsNavigationContext();
	const {
		navigationState
	} = useNavigationEntryContext();

	let row = $derived.by(() => {
		const rowID = navigationState.state.rowID;

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
