<script lang="ts">
	import { paneService } from '../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let { showActionsDropdown = $bindable(), paneId } = $props();

	function onActionClick(e: Event) {
		e.stopPropagation();
		showActionsDropdown = !showActionsDropdown;
	}

	function onSplitVertical() {
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
</script>

<div class="relative">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span onclick={onActionClick}>
		<svg
			fill="fill-neutral-700"
			class="mr-2 h-5 w-5"
			viewBox="0 0 25.4 14.098638"
			version="1.1"
			id="svg5"
			xml:space="preserve"
			xmlns="http://www.w3.org/2000/svg"
			><defs id="defs2" /><g id="layer1" transform="translate(-53.644677,-127.79211)"
				><path
					class="fill-neutral-700"
					d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
					id="path179"
				/></g
			></svg
		>
	</span>

	{#if showActionsDropdown}
		<div
			class="absolute end-0 z-10 mt-2 max-h-[100px] w-56 overflow-y-scroll rounded-md border border-neutral-100 bg-neutral-100 shadow-lg"
			role="menu"
		>
			<div class="">
				<button
					onclick={onSplitVertical}
					class="block w-full px-4 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
					role="menuitem"
				>
					Split Vertical
				</button>

				<button
					onclick={onSplitHorizontal}
					class="block w-full px-4 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
					role="menuitem"
				>
					Split Horizontal
				</button>
				

				<button
					onclick={onClosePane}
					class="block w-full px-4 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
					role="menuitem"
				>
					Close View
				</button>
			</div>
		</div>
	{/if}
</div>
