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
	let component: string = $state('');

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
			p.updateBuffer = (c: string) => {
				component = c;
			};
		}

		pane = p;
		paneService.subscribe(pane.id, updateHeightWidth);
		updateHeightWidth(paneService.heightWidth);
		component = pane?.buffer?.componentName;
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
