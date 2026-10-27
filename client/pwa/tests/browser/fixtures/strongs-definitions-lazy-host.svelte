<script lang="ts">
	import {
		Modules,
		provideApplicationContext,
		provideNavigationEntryContext,
		provideNavigationRuntimeContext,
		type ApplicationContext,
		type NavigationEntryContext,
		type NavigationState,
		type PaneNavigation
	} from '$lib/application';
	import { REFS_VIEWS } from '$lib/domains/bible/models/refs-navigation.model';
	import type { Strongs } from '$lib/domains/strongs';
	import type { PublishedResourceReference } from '$lib/resource';
	import StrongsDefsContainer from '$lib/domains/bible/modules/refs/strongsDefs/strongsDefsContainer.svelte';

	let {
		getDefinition,
		strongsRefs,
		strongsWords = [],
		collapseDefinitions = false
	}: {
		getDefinition: (source: PublishedResourceReference, key: string) => Promise<Strongs>;
		strongsRefs: string[];
		strongsWords?: string[];
		collapseDefinitions?: boolean;
	} = $props();

	const source = {
		publisher: 'test-publisher',
		resourceId: 'kjvonly/dictionary/entries/strongs-kjvs'
	};

	provideApplicationContext({
		strongsService: { get: getDefinition }
	} as unknown as ApplicationContext);
	provideNavigationEntryContext({
		navigationState: {
			module: Modules.STRONGS,
			view: REFS_VIEWS.ROOT,
			state: {}
		} as NavigationState
	} as NavigationEntryContext);
	provideNavigationRuntimeContext({
		navigation: { pushModule: () => {} } as unknown as PaneNavigation
	});
</script>

<StrongsDefsContainer
	strongsSource={source}
	{strongsRefs}
	{strongsWords}
	text=""
	{collapseDefinitions}
/>
