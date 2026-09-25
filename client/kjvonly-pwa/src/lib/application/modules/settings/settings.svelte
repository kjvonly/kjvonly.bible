<script lang="ts">
	// COMPONENTS
	import SettingsPage from './components/settingsPage.svelte';
	import SettingsSearch from './components/settingsSearch.svelte';
	import SettingsScreen from './components/settingsScreen.svelte';

	// DEFINITIONS
	import { settingsDefinition } from './definitions/settings.definition';

	// RESOLVERS
	import { requireSettingsPage } from './resolvers/settings-definition-resolver';

	// MODELS
	import type { NavigationComponentProps } from '../../services/navigation.service';
	import type { SettingsSearchEntry } from './search/settings-search.model';

	// RUNTIME
	import { useSettingsNavigationContext } from './runtime/settings-navigation-context';

	// SEARCH
	import {
		createSettingsSearchEntries,
		searchSettings
	} from './search/settings-search';

	// =============================== BINDINGS ================================

	let {
		clientHeight,
		obj = $bindable(),
		navService = $bindable()
	}: NavigationComponentProps = $props();

	// ================================= VARS ==================================

	const settingsNavigation = useSettingsNavigationContext();
	const rootPage = requireSettingsPage(settingsDefinition.rootPageID);
	const searchEntries = createSettingsSearchEntries(settingsDefinition);
	let searchQuery = $state('');
	let searchResults = $derived(
		searchSettings(searchEntries, searchQuery)
	);
	let isSearching = $derived(searchQuery.trim().length > 0);

	// ================================ FUNCS ==================================

	function onClose(event: Event): void {
		event.stopPropagation();
		const close = obj.onClose;

		if (typeof close !== 'function') {
			throw new Error('Settings navigation requires an onClose callback.');
		}

		close();
	}

	function onSearchResultSelect(result: SettingsSearchEntry): void {
		settingsNavigation.navigateToSearchResult(result);
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<SettingsScreen
	title="Settings"
	{clientHeight}
	{onClose}
	bodyClasses=""
>
	<SettingsSearch
		query={searchQuery}
		results={searchResults}
		onQueryChange={(query) => (searchQuery = query)}
		onResultSelect={onSearchResultSelect}
	></SettingsSearch>

	{#if !isSearching}
		<SettingsPage page={rootPage}></SettingsPage>
	{/if}
</SettingsScreen>
