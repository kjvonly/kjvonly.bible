<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import type { NavigationService } from '$lib/application/services/navigation.service';
	import { stopPropagation } from '$lib/application/ui/click';

	// COMPONENTS
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		navService
	}: {
		paneID: string;
		navService: NavigationService;
	} = $props();

	// ================================= VARS ==================================

	let clientHeight: number = $state(0);
	let nav = $derived(navService.views);
</script>

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	{#each $nav as n, index}
		{@const Component = n.component}
		<div
			role="button"
			tabindex="0"
			class="{index === $nav.length - 1 ? '' : 'hidden'} h-full w-full"
			onclick={stopPropagation}
			onkeydown={stopPropagation}
		>
			<Component {paneID} {clientHeight} bind:obj={n.obj} {navService}></Component>
		</div>
	{/each}
</BufferContainer>
