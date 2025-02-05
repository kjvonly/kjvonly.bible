<script lang="ts">
	import {
		numberToLetters,
		renderGridTemplateAreas,
		type node
	} from '$lib/services/dynamicGrid.service';
	import { onMount } from 'svelte';

	import { paneService } from '$lib/services/pane.service.svelte';
	import { Buffer } from '$lib/models/buffer.model';
	import Pane from '$lib/components/pane.svelte';


	let template = $state();
	let elements: string[] = $state([]);
	let deletedElements: any = $state({});

	function onGridUpdate() {
		let gta = renderGridTemplateAreas(paneService.rootPane);

		let els: any = {};
		let grid = '';

		for (let i = 0; i < gta.length; i++) {
			let s = '';
			for (let j = 0; j < gta[i].length; j++) {
				s += `${gta[i][j]} `;
				els[gta[i][j]] = gta[i][j];
			}
			grid += '"' + s + '"\n';
		}

		elements = Object.keys(els)
			.concat(Object.keys(deletedElements))
			.sort((a: string, b: string) => {
				let aval = 0,
					bval = 0;

				for (let i = 0; i < a.length; i++) {
					aval += a.charCodeAt(i) - 96;
				}
				for (let i = 0; i < b.length; i++) {
					bval += b.charCodeAt(i) - 96;
				}
				return aval - bval;
			});

		//
		template = `display: grid;
		max-height: 100vh;
		grid-template-columns: repeat(${gta.length}, ${gta[0].length});

  		grid-template-areas:
			${grid};`;

		let hw: any = {};
		let gtaRows = gta.length;
		let gtaCols = gta[0].length;

		Object.keys(els).forEach((k) => {
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

			hw[k] = {
				height: (rows.length * 1.0) / gtaRows,
				width: (rows[0].length * 1.0) / gtaCols
			};
		});

		paneService.heightWidth = hw;
		paneService.publishHw(hw);
	}

	function findNodes(n: node, key: string): node | undefined {
		if (n.id === key) {
			return n;
		}
		let found;

		if (n.left) {
			found = findNodes(n.left, key);
		}

		if (found) {
			return found;
		}

		if (n.right) {
			found = findNodes(n.right, key);
		}

		return found;
	}

	function splitPane(paneId: string, split: string, componentName: string, bag: any) {
		let n = findNodes(paneService.rootPane, paneId);

		/**n should never be undefined */
		if (!n) {
			return;
		}

		let lid: string = elements[elements.length - 1];
		let val = 0;
		for (let i = 0; i < lid.length; i++) {
			val += lid.charCodeAt(i) - 96;
		}

		let nid = numberToLetters(val + 1);
		if (n.left && n.right) {
			let buffer = new Buffer();
			buffer.componentName = componentName;
			buffer.name = componentName;
			buffer.bag = bag;

			n.left = {
				split: n.split,
				left: {
					id: n.id,
					buffer: n.buffer
				},
				right: {
					id: nid,
					buffer: buffer
				}
			};
			n.id = undefined;
			n.split = split;
		} else {
			n.split = split;
			n.left = {
				id: n.id
			};

			let buffer = new Buffer();
			buffer.componentName = componentName;
			buffer.name = componentName;
			buffer.bag = bag;

			n.right = {
				id: nid,
				buffer: buffer
			};
			n.id = undefined;
		}
		onGridUpdate();
	}

	function deletePane(n: node, key: string) {
		if (n.id === key) {
			return n;
		}
		let found;

		if (n.left) {
			found = deletePane(n.left, key);
		}

		if (found) {
			deletedElements[n.left.id] = n.left.id;
			paneService.unsubscribe(n.left.id);
			//do delete. this is the parent
			if (n.right.split) {
				n.split = n.right.split;
				n.left = n.right.left;
				n.right = n.right.right;
			} else {
				n.id = n.right.id;
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
			let tmp = n.right.id;
			deletedElements[n.right.id] = n.right.id;
			paneService.unsubscribe(n.right.id);
			//do delete this is the parent
			if (n.left.split) {
				n.split = n.left.split;
				n.right = n.left.right;
				n.left = n.left.left;
			} else {
				n.id = n.left.id;
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
	});
</script>

<div class="flex h-[100vh] w-full flex-col">
	<div style="max-height: 100vh; min-width: 1px; {template};" class=" w-full">
		{#each elements as paneId}
			{#if !deletedElements[paneId]}
				<div class="relateive outline" style="grid-area: {paneId};">
					<Pane {paneId}></Pane>
				</div>
			{/if}
		{/each}
	</div>
</div>
