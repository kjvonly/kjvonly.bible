<script lang="ts">
	import {
		base26ToDecimal,
		numberToLetters,
		renderGridTemplateAreas
	} from '$lib/services/dynamicGrid.service';
	import { onMount } from 'svelte';

	import { paneService } from '$lib/services/pane.service.svelte';
	import { Buffer } from '$lib/models/buffer.model';
	import PaneContainer from '$lib/components/pane.svelte';
	import { type Pane } from '$lib/models/pane.model';
	import { toastService } from '$lib/services/toast.service';

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
		grid-template-columns: repeat(${gta.length}, ${gta[0].length});

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

	function findPane(p: Pane, paneId: string): Pane | undefined {
		if (p.id === paneId) {
			return p;
		}
		let found;

		if (p.left) {
			found = findPane(p.left, paneId);
		}

		if (found) {
			return found;
		}

		if (p.right) {
			found = findPane(p.right, paneId);
		}

		return found;
	}

	function splitPane(paneId: string, split: string, componentName: string, bag: any) {
		let p = findPane(paneService.rootPane, paneId);

		/** p should never be undefined */
		if (!p) {
			return;
		}

		let lastPaneId: string = paneIds[paneIds.length - 1];
		let val = base26ToDecimal(lastPaneId);
		let pid = numberToLetters(val + 1);

		p.split = split;
		p.left = {
			id: p.id,
			buffer: p.buffer,
			updateBuffer: p.updateBuffer,
			toggle: p.toggle
		};

		let buffer = new Buffer();
		buffer.componentName = componentName;
		buffer.name = componentName;
		buffer.bag = bag;

		p.right = {
			id: pid,
			buffer: buffer
		};
		p.id = undefined;
		/**
		 * TODO
		 * May want to delete other variables too
		 * need to make sure it does not effect
		 * the left node vars we just copied.
		 */

		onGridUpdate();
	}

	function deletePane(n: Pane, key: string) {
		if (n.id === paneService.rootPane.id && n.left === undefined && n.right === undefined) {
			n.buffer.componentName = 'Modules';
			n.buffer.bag = {};
			n.updateBuffer('Modules');
		}

		if (n.id === key) {
			return n;
		}
		let found;

		if (n.left) {
			found = deletePane(n.left, key);
		}

		if (found) {
			deletedPaneIds[n.left.id] = n.left.id;
			paneService.unsubscribe(n.left.id);
			//do delete. this is the parent
			if (n.right.split) {
				n.split = n.right.split;
				n.left = n.right.left;
				n.right = n.right.right;
			} else {
				n.id = n.right.id;
				n.updateBuffer = n.right.updateBuffer;
				n.toggle = n.right.toggle;
				n.buffer = n.right.buffer;
				n.split = undefined;
				n.left = undefined;
				n.right = undefined;
			}

			onGridUpdate();
			return;
		}

		if (n.right) {
			found = deletePane(n.right, key);
		}

		if (found) {
			deletedPaneIds[n.right.id] = n.right.id;
			paneService.unsubscribe(n.right.id);
			//do delete this is the parent
			if (n.left.split) {
				n.split = n.left.split;
				n.right = n.left.right;
				n.left = n.left.left;
			} else {
				n.id = n.left.id;
				n.updateBuffer = n.left.updateBuffer;
				n.toggle = n.left.toggle;
				n.buffer = n.left.buffer;
				n.split = undefined;
				n.left = undefined;
				n.right = undefined;
			}

			onGridUpdate();
			return;
		}
	}

	onMount(() => {
		let link = document.createElement('link');
		link.setAttribute('rel', 'manifest');
		link.setAttribute('href', `/manifest.json`);
		document.getElementById('kjvonly-head')?.appendChild(link);

		paneService.rootPane.buffer = new Buffer();
		paneService.rootPane.buffer.componentName = 'ChapterContainer';
		paneService.rootPane.buffer.name = 'ChapterContainer';
		paneService.onDeletePane = deletePane;
		paneService.onSplitPane = splitPane;
		onGridUpdate();

		toastService.showToast = showToast;
	});

	let toasts: string[] = $state([]);
	let timeoutId = 0;
	function showToast(message: string) {
		toasts.push(message);
		timeoutId = setTimeout(() => {
			toasts.shift();
		}, 2500 * toasts.length);
	}
</script>

<div class="flex h-[100vh] w-full flex-col">
	<div style="max-height: 100vh; min-width: 1px; {template};" class="w-full">
		{#each paneIds as paneId}
			{#if !deletedPaneIds[paneId]}
				<div class="outline" style="grid-area: {paneId};">
					<PaneContainer {paneId}></PaneContainer>
				</div>
			{/if}
		{/each}
	</div>
</div>

{#if toasts.length > 0}
	<div class="fixed end-4 bottom-4 z-[10000] flex flex-col">
		{#each [...toasts].reverse() as t}
			<aside
				class="my-2 flex items-center justify-center gap-4 rounded-lg border bg-neutral-100 px-5 py-3"
			>
				{t}
			</aside>
		{/each}
	</div>
{/if}
