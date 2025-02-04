<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '../../../components/dynamic-grid-template-areas/pane.service.svelte';
	import { type node } from '../../../components/dynamic-grid-template-areas/dynamicGrid';
	import { newChapterSettings, type ChapterSettings } from '../bible/models/chapterSettings';
	import { componentMapping } from '$lib/services/component-mapping.service';
	import { colorTheme } from '$lib/services/colorTheme.service';

	let containerHeight: string = $state('');
	let containerWidth: string = $state('');
	let chapterSettings: ChapterSettings | null = $state(null);

	let { paneId = $bindable<string>() } = $props();

	let pane: node = $state();
	$effect(() => {
		paneId;
		pane = paneService.findNode(paneService.rootPane, paneId);
	});

	function updateHw(hw: any) {
		console.log('hw', hw[pane.id]);
		containerHeight = `height: ${hw[pane.id].height * 100}vh;`;
		containerWidth = `width: ${hw[pane.id].width * 100}vw;`;
	}

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

		pane = paneService.findNode(paneService.rootPane, paneId);
		paneService.subscribe(pane.id, updateHw);
		updateHw(paneService.hw);
		console.log(pane);
	});
</script>

<div style="{containerWidth} {containerHeight}" class="relative overflow-hidden">
	<div style="{containerHeight} {containerWidth}" class="relative overflow-y-scroll">

		<div class="header bg-neutral-950 w-full items-center text-balance outline">
			{#if pane?.buffer?.componentName}
				{@const Component = componentMapping.getComponent(pane?.buffer?.componentName)}
				<Component bind:containerHeight bind:containerWidth paneId={pane.id}></Component>
			{/if}
		</div>
	</div>
</div>
