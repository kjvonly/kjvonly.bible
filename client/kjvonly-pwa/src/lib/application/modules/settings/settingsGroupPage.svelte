<script lang="ts">
	// COMPONENTS
	import SettingsPage from './components/settingsPage.svelte';
	import SettingsScreen from './components/settingsScreen.svelte';

	// MODELS
	import type { NavigationComponentProps } from '../../services/navigation.service';

	// RESOLVERS
	import { requireSettingsPage } from './resolvers/settings-definition-resolver';

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
	let pageID = $derived.by(() => {
		const pageID = obj.pageID;

		if (typeof pageID !== 'string') {
			throw new Error('Settings page navigation requires a pageID.');
		}

		return pageID;
	});
	let focusRowID = $derived.by(() => {
		const focusRowID = obj.focusRowID;

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
