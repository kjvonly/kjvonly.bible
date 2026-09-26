<script lang="ts">
	// COMPONENTS
	import SettingsPage from './components/settingsPage.svelte';
	import SettingsScreen from './components/settingsScreen.svelte';

	// RESOLVERS
	import { requireSettingsPage } from './resolvers/settings-definition-resolver';

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

	let pageID = $derived.by(() => {
		const pageID = navigationState.state.pageID;

		if (typeof pageID !== 'string') {
			throw new Error('Settings page navigation requires a pageID.');
		}

		return pageID;
	});

	let focusRowID = $derived.by(() => {
		const focusRowID = navigationState.state.focusRowID;

		return typeof focusRowID === 'string'
			? focusRowID
			: undefined;
	});

	let page = $derived(requireSettingsPage(pageID));

	// ================================ FUNCS ==================================

	function onBack(event: Event): void {
		event.stopPropagation();
		settingsNavigation.back();
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<SettingsScreen title={page.title} {clientHeight} {onBack}>
	<SettingsPage {page} {focusRowID}></SettingsPage>
</SettingsScreen>
