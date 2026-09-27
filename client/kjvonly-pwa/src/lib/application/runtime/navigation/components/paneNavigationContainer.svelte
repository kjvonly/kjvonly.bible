<script lang="ts">
	import type {
		PaneNavigationService
	} from '../../../services/pane-navigation.service';

	import {
		stopPropagation
	} from '../../../ui/click';

	import PaneSurface from '../../pane/components/paneSurface.svelte';
	import NavigationEntry from './navigationEntry.svelte';

	let {
		navigation
	}: {
		navigation: PaneNavigationService;
	} = $props();

	let views = $derived(navigation.views);
</script>

<PaneSurface>
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
				{navigation}
			></NavigationEntry>
		</div>
	{/each}
</PaneSurface>
