<script lang="ts">
	import {
		provideApplicationContext,
		provideNavigationEntryContext,
		provideNavigationRuntimeContext,
		providePaneLayoutContext,
		type ApplicationContext,
		type NavigationState,
		type PaneNavigation
	} from '$lib/application';

	import NormalizedContentReader from '$lib/domains/normalized-content/modules/reader/normalizedContentReader.svelte';

	let {
		applicationContext,
		navigation,
		navigationState
	}: {
		applicationContext: ApplicationContext;
		navigation: PaneNavigation;
		navigationState: NavigationState;
	} = $props();

	provideApplicationContext(
		applicationContext
	);

	provideNavigationRuntimeContext({
		navigation
	});

	provideNavigationEntryContext({
		navigationState,
		isActive: () => true,
		onResult: () => () => {},
		whenActive: () => () => {},
		updateState: () => {},
		updateResourceSelection: () => {}
	});

	providePaneLayoutContext({
		clientHeight: 800,
		clientWidth: 1200
	});
</script>

<NormalizedContentReader></NormalizedContentReader>
