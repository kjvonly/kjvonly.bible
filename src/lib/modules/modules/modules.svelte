<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import type { node } from '$lib/components/dynamic-grid-template-areas/dynamicGrid';

	let components = ['ChapterContainer', 'Search'];
	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

let pane: node = $state()
  
	onMount(() => {
        pane = paneService.findNode(paneService.rootPane, paneId)
    });
</script>

<div style={containerHeight} class="overflow-hidden">
	<div class="flex flex-col items-center justify-center">
		<div class="flex w-full justify-end">
			<button
				onclick={() => {
					paneService.onDeletePane(paneService.rootPane, paneId);
				}}
				class="px-2 pt-2 text-neutral-700">Close</button
			>
		</div>
		<div class="gap-2 grid grid-cols-2 w-full p-4 overflow-y-scroll">
			{#each components as c}
				<button class="bg-neutral-100 rounded-lg text-neutral-700 h-24" onclick={() => {
                    pane.updateBuffer(c)
                }}>
					<span>{c}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
