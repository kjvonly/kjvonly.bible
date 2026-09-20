<script lang="ts">
	import {
		sortPaneIDs,
		WorkspaceChangeType,
		type WorkspaceChange,
		useApplicationContext
	} from '$lib/application';
	import { onMount } from 'svelte';

	import { PaneContainer } from '$lib/application/ui';
	const {
		workspaceRuntime,
		toastService
	} = useApplicationContext();

	let template = $state();
	let paneIds: string[] = $state([]);
	let deletedPaneIds: Record<string, true> = $state({});

	function onGridUpdate() {
		const layout =
			workspaceRuntime.deriveLayout();

		paneIds = sortPaneIDs(
			layout.activePaneIDs.concat(
				Object.keys(
					deletedPaneIds
				)
			)
		);

		template = layout.template;
		workspaceRuntime.publishPaneDimensions(
			layout.paneDimensionsByID
		);
	}

	function onWorkspaceChange(
		change: WorkspaceChange
	): void {
		if (
			change.type ===
			WorkspaceChangeType.PANE_DELETED
		) {
			deletedPaneIds[
				change.deletedPaneID
			] = true;
			onGridUpdate();
			return;
		}

		if (
			change.type ===
			WorkspaceChangeType.PANE_SPLIT
		) {
			onGridUpdate();
		}
	}

	

	let toasts: string[] = $state([]);
	function enqueueToast(message: string): void {
		toasts.push(message);
		setTimeout(() => {
			toasts.shift();
		}, 2500 * toasts.length);
	}

	onMount(() => {
		const unsubscribeWorkspace =
			workspaceRuntime.subscribe(
				onWorkspaceChange
			);

		/**
		 * DEV NOTE: Update the component to w/e you are working on
		 * Save you a few clicks on reload.
		 */

		onGridUpdate();

		const unsubscribeToasts =
			toastService.subscribeToToasts(
				enqueueToast
			);

		return () => {
			unsubscribeWorkspace();
			unsubscribeToasts();
		};
	});
</script>

<div class="flex h-[100vh] w-full flex-col">
	<div style="max-height: 100vh; min-width: 1px; {template};" class="w-full">
		{#each paneIds as paneID}
			{#if !deletedPaneIds[paneID]}
				<div class="outline outline-neutral-400" style="grid-area: {paneID};">
					<PaneContainer {paneID}></PaneContainer>
				</div>
			{/if}
		{/each}
	</div>
</div>

{#if toasts.length > 0}
	<div class="fixed end-4 bottom-4 z-[10000] flex flex-col">
		{#each [...toasts].reverse() as t}
			<aside
				class="my-2 flex items-center justify-center gap-4 rounded-lg border bg-neutral-400 px-5 py-3"
			>
				{t}
			</aside>
		{/each}
	</div>
{/if}
