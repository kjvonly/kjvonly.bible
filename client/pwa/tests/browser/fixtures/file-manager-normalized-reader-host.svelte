<script lang="ts">
	import type {
		ApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		provideApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		provideNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';
	import {
		providePaneLayoutContext
	} from '$lib/application/runtime/pane/pane-layout-context';
	import PaneNavigationContainer from '$lib/application/runtime/navigation/components/paneNavigationContainer.svelte';
	import type {
		PaneNavigationService
	} from '$lib/application/services/pane-navigation.service';

	let {
		applicationContext,
		navigation,
		paneWidth = 1100
	}: {
		applicationContext: ApplicationContext;
		navigation: PaneNavigationService;
		paneWidth?: number;
	} = $props();

	provideApplicationContext(applicationContext);
	provideNavigationRuntimeContext({ navigation });
	providePaneLayoutContext({
		clientHeight: 800,
		clientWidth: paneWidth
	});
</script>

<PaneNavigationContainer {navigation}></PaneNavigationContainer>
