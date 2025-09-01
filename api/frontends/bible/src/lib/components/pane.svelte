<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { newSettings, type Settings } from '../models/settings.model';
	import { componentMapping } from '$lib/services/componentMappingService';
	import { settingsService } from '$lib/services/settings.service';
	import type { Pane } from '$lib/models/pane.model';

	let containerHeight: string = $state('');
	let containerWidth: string = $state('');
	let chapterSettings: Settings | null = $state(null);

	let { paneId = $bindable<string>() } = $props();

	let pane: Pane | any = $state();

	function updateHeightWidth(hw: any) {
		/** This is so important. What was happening in split pane was we'd
		 * assign the pane vars to an new pane object and remove the pane.id
		 * by setting it to undefined. i suppose we dont need unset pane id but
		 * the idea is that the existing pane becomes a branch pane so we would
		 * assign the pane vars to a new object and unset the pane id var.
		 * eventually, svelte would update and the pane.id, which would be
		 * undefined. The paneId was still correct. I'm thinking
		 * on update this would be the place to reassign the pane.
		 *
		 * So what made this a very difficult bug to detect was when we assign
		 * the pane to $state, its a new object, setting id = undefined did not
		 * automatically trigger a state refresh. Eventually, when the object would
		 * react to the change the pane.id would be undefined causing the code to flow
		 * to the else block and not updating the height and width of the container.
		 *
		 * looking at the split code in +page.svelte it's obvious that we are creating
		 * an new object and the references of the original pane object would not change.
		 *
		 * If paneId was bound with pane.id then when the pane.id was reset to undefined
		 * then every child paneId bound with pane.id would be undefined causing w/e
		 * issue.
		 *
		 * I don't think a paneId ever changes. So we should make it a convention
		 * to use paneId instead of pane.id. There's a few moments when id is unset
		 * and the paneId would be undefined.
		 *
		 * Also the vars except id are objects so those would have the same reference if bound
		 * to a child component.
		 */
		pane = paneService.findNode(paneService.rootPane, paneId);
		if (hw[paneId]) {
			containerHeight = `height: ${hw[paneId].height * 100}vh;`;
			containerWidth = `width: ${hw[paneId].width * 100}vw;`;
		} else {
			console.log('error should have update height and width');
		}
	}

	onMount(() => {
		let cs = localStorage.getItem('settings');
		if (cs !== null) {
			chapterSettings = JSON.parse(cs);

			if (chapterSettings && chapterSettings.colorTheme) {
				settingsService.setTheme(chapterSettings?.colorTheme);
			}
		} else {
			chapterSettings = newSettings();
		}

		let p = paneService.findNode(paneService.rootPane, paneId);

		/**
		 * Pane buffer history:
		 *
		 * Just used for modules to update the component. without rerendering the panes
		 * could be useful tho for components to navigate back and forth without needing
		 * create a new pane. See a history of buffers in a pane and then being able to
		 * navigate back through the buffer list prior to closing the pane.
		 */
		if (p) {
			p.toggle = false;
			p.updateBuffer = (c: string) => {
				p.buffer.componentName = c;
				p.toggle = !p.toggle;
				pane = p;
			};
		}

		pane = p;
		paneService.subscribe(paneId, updateHeightWidth);
		updateHeightWidth(paneService.heightWidth);
	});
</script>

<div style="{containerWidth} {containerHeight}">
	<!-- Since component is a Const we need a way to rerender this when the component changes. 
			     We accomplish this with the toggle. -->
	{#if pane?.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth bind:pane {paneId}></Component>
		{/if}
	{/if}

	{#if pane && !pane.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth bind:pane {paneId}></Component>
		{/if}
	{/if}
</div>
