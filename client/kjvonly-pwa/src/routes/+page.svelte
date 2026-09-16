<script lang="ts">
	import {
		base26ToDecimal,
		numberToLetters,
		renderGridTemplateAreas,
		renderGridTemplateColumns
	} from '$lib/application/services/dynamicGrid.service';
	import { onMount } from 'svelte';

	import { paneService } from '$lib/application/services/pane.service.svelte';
	import PaneContainer from '$lib/application/runtime/pane/components/pane.svelte';
	import { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';
	import {
		deletePane as deletePaneFromTree,
		findPane,
		splitPane as splitPaneInTree
	} from '$lib/application/runtime/workspace/workspace-pane-tree';
	import { toastService } from '$lib/application/services/toast.service';
	import { Modules } from '$lib/application/models/modules.model';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	let template = $state();
	let paneIds: string[] = $state([]);
	let deletedPaneIds: any = $state({});

	function onGridUpdate() {
		let gta = renderGridTemplateAreas(paneService.rootPane);

		let areas: any = {};
		let grid = '';

		for (let i = 0; i < gta.length; i++) {
			let s = '';
			for (let j = 0; j < gta[i].length; j++) {
				s += `${gta[i][j]} `;
				areas[gta[i][j]] = gta[i][j];
			}
			grid += '"' + s + '"\n';
		}

		paneIds = Object.keys(areas)
			.concat(Object.keys(deletedPaneIds))
			.sort((a: string, b: string) => {
				let aval = base26ToDecimal(a);
				let bval = base26ToDecimal(b);
				return aval - bval;
			});

		template = `display: grid;
		max-height: 100vh;
		grid-template-columns: ${renderGridTemplateColumns(gta)};

  		grid-template-areas:
			${grid};`;

		let heightWidth: any = {};
		let gtaRows = gta.length;
		let gtaCols = gta[0].length;

		Object.keys(areas).forEach((k) => {
			let rows = [];
			for (let i = 0; i < gta.length; i++) {
				let cols: any = [];
				for (let j = 0; j < gta[i].length; j++) {
					if (gta[i][j] === k) {
						cols.push([gta[i][j]]);
					}
				}
				if (cols.length > 0) {
					rows.push(cols);
				}
			}

			heightWidth[k] = {
				height: (rows.length * 1.0) / gtaRows,
				width: (rows[0].length * 1.0) / gtaCols
			};
		});

		paneService.heightWidth = heightWidth;
		paneService.publishHw(heightWidth);
	}

	function splitPane(
		paneID: string,
		split: PaneSplit,
		componentName: Modules,
		bag: any
	) {
		const pane = findPane(
			paneService.rootPane,
			paneID
		);

		/** pane should never be undefined */
		if (!pane) {
			return;
		}

		let lastPaneId: string = paneIds[paneIds.length - 1];
		let val = base26ToDecimal(lastPaneId);
		let pid = numberToLetters(val + 1);

		const originatingBuffer = pane.buffer;
		const buffer = moduleBufferFactory.related(
			componentName,
			originatingBuffer,
			bag
		);

		buffer.name = `${componentName}`;

		if (
			!splitPaneInTree({
				rootPane:
					paneService.rootPane,
				paneID,
				newPaneID:
					pid,
				split,
				buffer
			})
		) {
			return;
		}

		paneService.save();
		onGridUpdate();
	}

	function deletePane(paneID: string) {
		const rootPane =
			paneService.rootPane;

		if (
			rootPane.id === paneID &&
			rootPane.left === undefined &&
			rootPane.right === undefined
		) {
			rootPane.buffer.componentName =
				Modules.MODULES;
			rootPane.buffer.bag = {};
			rootPane.updateBuffer(
				Modules.MODULES
			);
			return;
		}

		const result =
			deletePaneFromTree(
				rootPane,
				paneID
			);

		if (!result) {
			return;
		}

		deletedPaneIds[
			result.deletedPaneID
		] = result.deletedPaneID;
		paneService.unsubscribe(
			result.deletedPaneID
		);
		paneService.save();
		onGridUpdate();
	}

	

	let toasts: string[] = $state([]);
	let timeoutId = {};
	function showToast(message: string) {
		toasts.push(message);
		timeoutId = setTimeout(() => {
			toasts.shift();
		}, 2500 * toasts.length);
	}

	function trySetDataPersistence() {
		(async () => {
			if (navigator.storage && navigator.storage.persist) {
				const persisted = await navigator.storage.persisted();
				if (!persisted) {
					const granted = await navigator.storage.persist();

					if (granted) {
						console.log('Persistent storage granted');
					} else {
						console.log('Persistent storage NOT granted');
					}
				}
			}
		})();
	}

	const { moduleBufferFactory } = useApplicationContext();

	onMount(() => {
		let link = document.createElement('link');
		link.setAttribute('rel', 'manifest');
		link.setAttribute('href', `/manifest.json`);
		document.getElementById('kjvonly-head')?.appendChild(link);

		paneService.onDeletePane = deletePane;
		paneService.onSplitPane = splitPane;

		const restored =
			paneService.restore();

		if (!restored) {
			paneService.rootPane.buffer =
				moduleBufferFactory.independent(
					Modules.BIBLE
				);
		}

		/**
		 * DEV NOTE: Update the component to w/e you are working on
		 * Save you a few clicks on reload.
		 */

		onGridUpdate();

		trySetDataPersistence();
		toastService.showToast = showToast;
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
