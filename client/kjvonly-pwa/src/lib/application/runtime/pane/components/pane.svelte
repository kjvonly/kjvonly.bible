<script lang="ts">
	import { onMount } from 'svelte';

	import type {
		WorkspacePaneDimensionsByID
	} from '$lib/application/runtime/workspace/workspace-layout';

	import {
		useApplicationContext
	} from '$lib/application/runtime/application-context';

	import {
		provideNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	import PaneNavigationContainer from '../../navigation/components/paneNavigationContainer.svelte';

	let { paneID }: { paneID: string } = $props();

	const {
		workspaceRuntime,
		navigationRuntimeFactory
	} = useApplicationContext();

	const navigationRuntime =
		navigationRuntimeFactory.create(
			paneID
		);

	provideNavigationRuntimeContext(
		navigationRuntime
	);

	let containerHeight: string = $state('');
	let containerWidth: string = $state('');

	function updatePaneDimensions(
		paneDimensionsByID: WorkspacePaneDimensionsByID
	) {
		if (paneDimensionsByID[paneID]) {
			containerHeight = `height: ${paneDimensionsByID[paneID].height * 100}vh;`;
			containerWidth = `width: ${paneDimensionsByID[paneID].width * 100}vw;`;
		}
	}

	onMount(() => {
		const unsubscribePaneDimensions =
			workspaceRuntime.subscribeToPaneDimensions(
				paneID,
				updatePaneDimensions
			);

		updatePaneDimensions(
			workspaceRuntime.getPaneDimensions()
		);

		return () => {
			unsubscribePaneDimensions();
		};
	});
</script>

<div style="{containerWidth} {containerHeight}">
	<PaneNavigationContainer
		navigation={navigationRuntime.navigation}
	></PaneNavigationContainer>
</div>
