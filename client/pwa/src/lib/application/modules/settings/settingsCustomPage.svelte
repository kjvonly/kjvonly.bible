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

	// ================================= VARS ==================================

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

</script>

<!-- ============================== CONTAINER ============================== -->

<SettingsScreen title={row.title}>
	{@const CustomComponent = resolveSettingsCustomViewComponent(row.view)}
	<CustomComponent></CustomComponent>
</SettingsScreen>
