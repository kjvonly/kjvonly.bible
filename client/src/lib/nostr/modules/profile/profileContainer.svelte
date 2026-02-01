<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import { onMount } from 'svelte';
	import { NavigationService } from '$lib/services/navigation.service';
	import { type Writable } from 'svelte/store';
	import { stopPropagation } from '$lib/utils/click';
	import Profile from './profile/profile.svelte';

	// =============================== BINDINGS ================================
	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();

	// ================================== VARS =================================

	let clientHeight: number = $state(0);
	let clientwidth: number = $state(0);
	let nav: Writable<any[]> | undefined = $state();
	let navService: NavigationService = new NavigationService();

	onMount(() => {
		navService.push({ component: Profile, obj: {} });
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
				<Component {paneID} bind:clientHeight bind:obj={n.obj} bind:navService
				></Component>
			</div>
		{/each}
	{/if}
</BufferContainer>
