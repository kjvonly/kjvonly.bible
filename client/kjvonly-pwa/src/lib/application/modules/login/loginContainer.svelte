<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import LoginOptions from './loginOptions/loginOptions.svelte';
	import { type Writable } from 'svelte/store';
	import type { NavigationView } from '$lib/application/services/navigation.service';
	import { stopPropagation } from '$lib/application/ui/click';

	// =============================== BINDINGS ================================
	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();

	// ================================== VARS =================================
	let clientHeight: number = $state(0);

	let nav: Writable<NavigationView[]> | undefined = $state();
	const { navigationServiceFactory } = useApplicationContext();
	let navService = navigationServiceFactory.create();

	onMount(() => {
		navService.push({ component: LoginOptions, obj: {} });
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
				tabindex="0"
				role="button"
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
