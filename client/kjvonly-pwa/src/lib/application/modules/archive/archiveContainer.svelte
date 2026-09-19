<script lang="ts">
	// ================================ IMPORTS ================================

	// SVELTE
	import { onMount } from 'svelte';
	import { type Writable } from 'svelte/store';

	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { stopPropagation } from '$lib/application/ui/click';

	// COMPONENTS
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import Archive from './archive.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();

	// ================================= VARS ==================================

	let clientHeight: number = $state(0);
	let nav: Writable<any[]> | undefined = $state();

	const { navigationServiceFactory } = useApplicationContext();

	let navService = navigationServiceFactory.create();

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		navService.push({
			component: Archive,
			obj: {}
		});

		nav = navService.views;
	});
</script>

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	{#if nav}
		{#each $nav as n, index}
			{@const Component = n.component}
			<div
				class="{$nav && index === $nav.length - 1
					? ''
					: 'hidden'} h-full w-full"
				onclick={stopPropagation}
			>
				<Component {paneID} bind:clientHeight bind:obj={n.obj} {navService}
				></Component>
			</div>
		{/each}
	{/if}
</BufferContainer>
