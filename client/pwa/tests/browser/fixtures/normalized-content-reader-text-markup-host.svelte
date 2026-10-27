<script lang="ts">
	import {
		provideApplicationContext,
		provideNavigationEntryContext,
		provideNavigationRuntimeContext,
		providePaneLayoutContext,
		type ApplicationContext,
		type NavigationState,
		type NavigationStateValue,
		type PaneNavigation
	} from '$lib/application';

	import NormalizedContentReader from '$lib/domains/normalized-content/modules/reader/normalizedContentReader.svelte';

	let {
		applicationContext,
		navigation,
		navigationState,
		registerNavigationResult
	}: {
		applicationContext: ApplicationContext;
		navigation: PaneNavigation;
		navigationState: NavigationState;
		registerNavigationResult?: (handler: (result: NavigationStateValue) => void | Promise<void>) => void;
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
		onResult: (handler) => {
			registerNavigationResult?.(handler);
			return () => {};
		},
		onActivation: () => () => {},
		whenActive: (handler) => {
			void handler();
			return () => {};
		},
		updateState: () => {},
		updateResourceSelection: () => {}
	});

	providePaneLayoutContext({
		clientHeight: 800,
		clientWidth: 1200
	});
</script>

<NormalizedContentReader></NormalizedContentReader>
