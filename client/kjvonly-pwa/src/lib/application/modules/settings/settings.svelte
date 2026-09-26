<script lang="ts">
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import SettingsPage from './components/settingsPage.svelte';
	import SettingsSearch from './components/settingsSearch.svelte';
	import SettingsScreen from './components/settingsScreen.svelte';

	// DEFINITIONS
	import { settingsDefinition } from './definitions/settings.definition';

	// RESOLVERS
	import { requireSettingsPage } from './resolvers/settings-definition-resolver';

	// MODELS
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
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================= VARS ==================================


	const {
		navigation
	} = useNavigationRuntimeContext();

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

		navigation.back();
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
