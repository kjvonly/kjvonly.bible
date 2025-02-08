<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let { showActionsDropdown = $bindable(), paneId } = $props();

	let actions: any = {
		'split vertical': () => {onSplitVertical()},
		'split horizontal':() => {onSplitHorizontal()},
		'close': () => {onClosePane()}

	};


	function onSplitVertical(): void {
		paneService.onSplitPane(paneId, 'v', 'Modules', {});
		showActionsDropdown = false;
	}

	function onSplitHorizontal() {
		paneService.onSplitPane(paneId, 'h', 'Modules', {});
		showActionsDropdown = false;
	}

	function onClosePane() {
		paneService.onDeletePane(paneService.rootPane, paneId);
	}

	let containerHeight = $state(0)
	let headerHeight = $state(0)
</script>
<div bind:clientHeight={containerHeight} class="flex h-full w-full justify-center bg-neutral-50">
	<div class="w-full justify-center md:max-w-lg">
		<header bind:clientHeight={headerHeight} class="sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700">
			<div class="flex w-full justify-end p-2">
				<button
					onclick={() => {
						showActionsDropdown = false;
					}}
					class=" m-0 p-0"
				>
					Cancel
				</button>
			</div>
		</header>

		<div style="height: {containerHeight - headerHeight}px" class="flex w-full flex-col overflow-y-scroll border">
			{#each Object.keys(actions) as a}
				<div class="w-full">
					<button
						onclick={(event) => actions[a]()}
						class="w-full bg-neutral-50 p-4 text-start hover:bg-primary-50 capitalize">{a}</button
					>
				</div>
			{/each}
		</div>
	</div>
</div>
