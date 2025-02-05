<script lang="ts">
	import { onMount } from 'svelte';
	import { paneService } from '../../../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let components = ['ChapterContainer', 'Search'];

	let searchID = crypto.randomUUID();
	let searchInputHeight: number = $state(0);
	let searchText = $state('');
	let searchResults: any[] = $state([]);

	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

	function gotoBCV(componentName) {
		paneService.onSplitPane(paneId, 'h', 'ChapterContainer', { chapterKey: key });
	}

	onMount(() => {});
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
		<div class="gap2 grid grid-cols-2">
			{#each components as c}
				<button class="bg-primary-500 text-neutral-700" onclick={() => {}}>
					<span>c</span>
				</button>
			{/each}
		</div>
	</div>
</div>
