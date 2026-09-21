<script lang="ts">
	// ================================ IMPORTS ================================

	// SVELTE
	import { onMount } from 'svelte';
	import { type Writable } from 'svelte/store';

	// APPLICATION
	import type { NavigationView } from '$lib/application/services/navigation.service';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { stopPropagation } from '$lib/application/ui/click';

	// COMPONENTS
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import Archive from './archive.svelte';

	// =============================== BINDINGS ================================

	let { paneID, pane = $bindable() } = $props();

	// ================================= VARS ==================================

	let clientHeight: number = $state(0);
	let nav: Writable<NavigationView[]> | undefined = $state();

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
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				role="button"
				tabindex="0"
				class="{$nav && index === $nav.length - 1
					? ''
					: 'hidden'} h-full w-full"
				onclick={stopPropagation}
			>
				<Component {paneID} {clientHeight} bind:obj={n.obj} {navService}
				></Component>
			</div>
		{/each}
	{/if}
</BufferContainer>
