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
	import NormalizedContentTextMarkupLookupView from '$lib/domains/normalized-content/modules/reader/views/normalizedContentTextMarkupLookupView.svelte';

	let {
		navigation,
		applicationContext,
		navigationState
	}: {
		navigation: PaneNavigation;
		applicationContext: ApplicationContext;
		navigationState: NavigationState;
	} = $props();
	provideApplicationContext(applicationContext);
	provideNavigationRuntimeContext({ navigation });
	provideNavigationEntryContext({
		navigationState,
		isActive: () => true,
		onActivation: () => () => {},
		onResult: () => () => {},
		whenActive: (handler) => { void handler(); return () => {}; },
		updateState: () => {},
		updateResourceSelection: () => {}
	});
	providePaneLayoutContext({ clientHeight: 700, clientWidth: 375 });
</script>

<NormalizedContentTextMarkupLookupView></NormalizedContentTextMarkupLookupView>
