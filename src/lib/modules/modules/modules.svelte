<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import type { Pane } from '$lib/models/pane.model';

	let components: any = {
		bible: 'ChapterContainer',
		search: 'Search'
	};
	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

	let pane: Pane | any = $state();

	onMount(() => {
		pane = paneService.findNode(paneService.rootPane, paneId);
	});

	let headerHeight = $state(0);
</script>

<div style={containerHeight} class="overflow-hidden">
	<header
		bind:clientHeight={headerHeight}
		class="sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700"
	>
		<div class="flex w-full justify-end p-2">
			<button
				onclick={() => {
					paneService.onDeletePane(paneService.rootPane, paneId);
				}}
				class=" m-0 p-0"
			>
				Cancel
			</button>
		</div>
	</header>

	<div
		style="height: {containerHeight - headerHeight}px"
		class="flex flex-col items-center justify-center"
	>
		<div class="flex w-full flex-col overflow-y-scroll">
			{#each Object.keys(components) as c}
				<div class="w-full">
					<button
						onclick={(event) => pane.updateBuffer(components[c])}
						class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-primary-50">{c}</button
					>
				</div>
			{/each}
		</div>
	</div>
</div>
