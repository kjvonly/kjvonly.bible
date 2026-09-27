<script lang="ts">
	import {
		Modules
	} from '$lib/application/models/modules.model';
	import {
		SETTINGS_VIEWS
	} from '$lib/application/modules/settings/models/settings-navigation.model';
	import {
		settingsNavigationViewRegistrations
	} from '$lib/application/modules/settings/settings-navigation-view-registrations';
	import PaneNavigationContainer from '$lib/application/runtime/navigation/components/paneNavigationContainer.svelte';
	import {
		provideNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';
	import {
		providePaneLayoutContext,
		type PaneLayoutContext
	} from '$lib/application/runtime/pane/pane-layout-context';
	import type {
		ResourceSelections
	} from '$lib/application/resources/resource-selections';
	import {
		NavigationViewRegistry
	} from '$lib/application/runtime/rendering/navigation-view-registry';
	import {
		NavigationViewResolver
	} from '$lib/application/runtime/rendering/navigation-view-resolver';
	import {
		NavigationStateBuilder
	} from '$lib/application/services/navigation-state-builder';
	import {
		NavigationService
	} from '$lib/application/services/navigation.service';
	import {
		PaneNavigationService
	} from '$lib/application/services/pane-navigation.service';

	let {
		paneID
	}: {
		paneID: string;
	} = $props();

	const selections = {
		independent: () => ({}),
		related: (
			_module: Modules,
			originatingSelections: ResourceSelections
		) => originatingSelections,
		update: (
			_module: Modules,
			originatingSelections: ResourceSelections
		) => originatingSelections
	};

	const registry =
		new NavigationViewRegistry();

	registry.registerAll(
		settingsNavigationViewRegistrations
	);

	const navigation =
		new PaneNavigationService(
			paneID,
			new NavigationService(),
			new NavigationStateBuilder(
				selections
			),
			new NavigationViewResolver(
				registry
			),
			selections
		);

	provideNavigationRuntimeContext({
		navigation
	});

	const paneLayout =
		$state<PaneLayoutContext>({
			clientHeight: 0
		});

	providePaneLayoutContext(
		paneLayout
	);

	navigation.pushModule(
		Modules.SETTINGS,
		SETTINGS_VIEWS.ROOT,
		{}
	);
</script>

<div
	bind:clientHeight={paneLayout.clientHeight}
	style="height: 800px;"
>
	<PaneNavigationContainer
		{navigation}
	></PaneNavigationContainer>
</div>
