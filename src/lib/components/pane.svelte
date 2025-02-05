<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { type node } from '$lib/components/dynamic-grid-template-areas/dynamicGrid';
	import { newChapterSettings, type Settings } from '../models/settings.model';
	import { componentMapping } from '$lib/services/componentMappingService';
	import { colorTheme } from '$lib/services/colorTheme.service';

	let containerHeight: string = $state('');
	let containerWidth: string = $state('');
	let chapterSettings: Settings | null = $state(null);

	let { paneId = $bindable<string>() } = $props();

	let pane: node = $state();
	$effect(() => {
		paneId;
		pane = paneService.findNode(paneService.rootPane, paneId);
	});

	function updateHw(hw: any) {
		containerHeight = `height: ${hw[pane.id].height * 100}vh;`;
		containerWidth = `width: ${hw[pane.id].width * 100}vw;`;
	}
	let component = $state()

	onMount(() => {
		let cs = localStorage.getItem('chapterSettings');
		if (cs !== null) {
			chapterSettings = JSON.parse(cs);

			if (chapterSettings && chapterSettings.colorTheme) {
				colorTheme.setTheme(chapterSettings?.colorTheme);
			}
		} else {
			chapterSettings = newChapterSettings();
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
		p.updateBuffer = (c)=>{component = c}

		pane = p
		paneService.subscribe(pane.id, updateHw);
		updateHw(paneService.hw);
		component = pane?.buffer?.componentName
	});
</script>

<div style="{containerWidth} {containerHeight}" class="relative overflow-hidden">
	<div style="{containerHeight} {containerWidth}" class="relative overflow-y-scroll">
		<div class="header bg-neutral-950 w-full items-center text-balance outline">
			{#if pane?.buffer?.componentName}
				{@const Component = componentMapping.getComponent(component)}
				<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
			{/if}
		</div>
	</div>
</div>
