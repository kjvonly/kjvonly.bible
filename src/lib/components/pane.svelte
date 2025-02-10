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
	$effect(() => {
		paneId;
		pane = paneService.findNode(paneService.rootPane, paneId);
	});

	function updateHeightWidth(hw: any) {
		containerHeight = `height: ${hw[pane.id].height * 100}vh;`;
		containerWidth = `width: ${hw[pane.id].width * 100}vw;`;
	}

	onMount(() => {
		let cs = localStorage.getItem('chapterSettings');
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
		paneService.subscribe(pane.id, updateHeightWidth);
		updateHeightWidth(paneService.heightWidth);
	});
</script>

<div style="{containerWidth} {containerHeight}">
	<!-- Since component is a Const we need a way to rerender this when the component changes. 
			     We accomplish this with the toggle. -->
	{#if pane?.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
		{/if}
	{/if}

	{#if pane && !pane.toggle}
		{#if pane?.buffer?.componentName}
			{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
			<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
		{/if}
	{/if}
</div>
