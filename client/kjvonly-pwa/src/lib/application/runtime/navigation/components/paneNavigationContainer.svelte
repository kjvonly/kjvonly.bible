<script lang="ts">
	import type {
		PaneNavigationService
	} from '../../../services/pane-navigation.service';

	import {
		stopPropagation
	} from '../../../ui/click';

	import BufferContainer from '../../buffer/components/bufferContainer.svelte';
	import NavigationEntry from './navigationEntry.svelte';

	let {
		navigation
	}: {
		navigation: PaneNavigationService;
	} = $props();

	let clientHeight: number = $state(0);
	let views = $derived(navigation.views);
</script>

<BufferContainer bind:clientHeight>
	{#each $views as navigationView, index (navigationView)}
		<div
			role="button"
			tabindex="0"
			class="{index === $views.length - 1 ? '' : 'hidden'} h-full w-full"
			onclick={stopPropagation}
			onkeydown={stopPropagation}
		>
			<NavigationEntry
				{navigationView}
				{clientHeight}
			></NavigationEntry>
		</div>
	{/each}
</BufferContainer>
