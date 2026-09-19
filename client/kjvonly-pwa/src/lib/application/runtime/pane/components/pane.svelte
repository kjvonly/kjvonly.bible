<script lang="ts">
	import { onMount } from 'svelte';
	import { resolveModuleComponent } from '$lib/application/runtime/rendering/module-component-resolver';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
	import {
		WorkspaceChangeType,
		type WorkspaceChange
	} from '$lib/application/runtime/workspace/workspace-runtime';
	import type { WorkspacePaneDimensionsByID } from '$lib/application/runtime/workspace/workspace-layout';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	const { workspaceRuntime } =
		useApplicationContext();

	let containerHeight: string = $state('');
	let containerWidth: string = $state('');

	let { paneID = $bindable<string>() } = $props();

	let pane: Pane | undefined = $state();

	function updatePaneDimensions(
		paneDimensionsByID: WorkspacePaneDimensionsByID
	) {
		/**
		 * Learned lesson: paneID is the stable identity of this rendered Pane.
		 * The Pane object itself is not stable across workspace mutations. A split can
		 * turn the current leaf into a branch and move the rendered leaf state into a
		 * new child object while keeping the same paneID. Holding the old object caused
		 * subtle stale-state bugs because Svelte did not necessarily refresh this local
		 * reference at the same moment the tree structure changed.
		 *
		 * Re-resolve the Pane from WorkspaceRuntime whenever layout dimensions are
		 * published. Runtime/UI code should use paneID for identity rather than pane.id.
		 */
		pane = workspaceRuntime.findPane(
			paneID
		);

		if (paneDimensionsByID[paneID]) {
			containerHeight = `height: ${paneDimensionsByID[paneID].height * 100}vh;`;
			containerWidth = `width: ${paneDimensionsByID[paneID].width * 100}vw;`;
		} else {
			console.log('error should have update height and width');
		}
	}

	function onWorkspaceChange(
		change: WorkspaceChange
	): void {
		if (
			change.type !==
				WorkspaceChangeType.PANE_BUFFER_REPLACED ||
			change.paneID !== paneID
		) {
			return;
		}

		pane = workspaceRuntime.findPane(
			paneID
		);
	}

	onMount(() => {
		pane = workspaceRuntime.findPane(
			paneID
		);

		if (pane) {
			/**
			 * toggle is intentionally transient render state. We have seen Svelte retain
			 * stale module UI after Buffer navigation (notably annotations between Bible
			 * chapters) when only the underlying Buffer changed. WorkspaceRuntime flips
			 * this flag on Buffer replacement so the module component is recreated.
			 */
			pane.toggle = false;
		}

		const unsubscribeWorkspace =
			workspaceRuntime.subscribe(
				onWorkspaceChange
			);

		const unsubscribePaneDimensions =
			workspaceRuntime.subscribeToPaneDimensions(
				paneID,
				updatePaneDimensions
			);
		updatePaneDimensions(
			workspaceRuntime.getPaneDimensions()
		);

		return () => {
			// Pane components can be created/destroyed repeatedly as the workspace changes.
			// Always remove both subscriptions so stale Pane callbacks cannot accumulate.
			unsubscribeWorkspace();
			unsubscribePaneDimensions();
		};
	});
</script>

<div style="{containerWidth} {containerHeight}">
	<!--
		Learned lesson: changing Buffer data alone has not always caused Svelte to
		recreate the module component, which can leave module-local UI stale. Toggling
		between these branches deliberately recreates it after Buffer replacement.
		Keep this mechanism until the underlying reactivity issue is understood.
	-->
	{#if pane?.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = resolveModuleComponent(
				pane.buffer.componentName
			)}
			{#if Component}
				<Component bind:pane {paneID}></Component>
			{/if}
		{/if}
	{/if}

	{#if pane && !pane.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = resolveModuleComponent(
				pane.buffer.componentName
			)}
			{#if Component}
				<Component bind:pane {paneID}></Component>
			{/if}
		{/if}
	{/if}
</div>
