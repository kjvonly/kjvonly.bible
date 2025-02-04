<script lang="ts">
	import {
		numberToLetters,
		renderGridTemplateAreas,
		type node
	} from '../../../../components/dynamic-grid-template-areas/dynamicGrid';
	import { onMount } from 'svelte';

	import { paneService } from '../../../../components/dynamic-grid-template-areas/pane.service.svelte';
	import ChapterContainer from '../components/chapter/chapterContainer.svelte';
	import { Buffer } from '$lib/models/buffer.model';
	import { componentMapping } from '$lib/services/component-mapping.service';

	let toggle = $state(true);

	let template = $state();

	let elements = $state([]);
	let deletedElements = $state({});

	function onGridUpdate() {
		let gta = renderGridTemplateAreas(paneService.rootPane);

		let els = {};
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
		  grid-template-rows: auto auto;
  		grid-template-areas:
			${grid};`;
		console.log(grid);

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

		paneService.hw = hw;
		paneService.publishHw(hw);
		console.log(gta);
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
					buffer: n.buffer,
					parentSplit: n.split,
					direction: 'left'
				},
				right: {
					id: nid,
					buffer: buffer,
					parentSplit: n.split,
					direction: 'right'
				}
			};
			n.id = undefined;
			n.split = split;
		} else {
			n.split = split;
			n.left = {
				id: n.id,
				parentSplit: n.split,
				direction: 'left'
			};

			let buffer = new Buffer();
			buffer.componentName = componentName;
			buffer.name = componentName;
			buffer.bag = bag;

			n.right = {
				id: nid,
				buffer: buffer,
				parentSplit: n.split,
				direction: 'right'
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
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		{#each elements as a, idx}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			{#if !deletedElements[a]}
				{@const pane = findNodes(paneService.rootPane, a)}
				{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
				<div class="flex flex-shrink" style="grid-area: {a};">
					<button
						onclick={() => {
							console.log('delete pane', pane.id);
							paneService.onDeletePane(paneService.rootPane, pane.id);
							//paneService.save();
						}}
						class="absolute right-2 z-popover float-end inline-block text-primary-500">x</button
					>
					<div
						class="header bg-neutral-950 w-full items-center text-balance {pane.parentSplit === 'v'
							? pane.direction === 'left'
								? 'border-e border-neutral-700'
								: 'border-s border-neutral-700'
							: ''}  {pane.parentSplit === 'h'
							? pane.direction === 'left'
								? 'border-b border-neutral-700'
								: 'border-t border-neutral-700'
							: ''}"
					>
						<Component paneId={a}></Component>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
</style>
