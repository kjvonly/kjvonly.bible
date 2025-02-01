<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';
	import { NullBuffer } from '$lib/models/buffer.model';

	import VerticalSplit from './vertical-split.svelte';
	import HorizontalSplit from './horizontal-split.svelte';
	import ChapterContainer from '../../routes/(bible)/bible/components/chapterContainer.svelte';
	import { paneService } from '$lib/services/pane.service';

	let _id = crypto.randomUUID();
	let { id, pane = $bindable<Pane>() } = $props();
	let borderStyling = $state('');
	$effect(() => {
		borderStyling;

		borderStyling = pane && pane.split === PaneSplit.Null ? 'border border-neutral-700' : '';
	});
</script>

<div id="_{id}-pane" class="h-full w-full">
	{#if pane && pane.split === PaneSplit.Null}
		<div class="relative h-full w-full">

			<div class="sticky right-0 top-0 z-popover {pane.id === paneService.rootPane.id ? 'hidden' : ''}">
				<button
					onclick={() => {
						paneService.deletePane(pane.id)
					}}
					class=" absolute right-2 top-0 text-primary-500">x</button
				>
			</div>
			<div id="_{id}-buffer-pane" class="h-[100%] w-full {borderStyling}">
				{#if !(pane.buffer instanceof NullBuffer)}
					{@const Component = pane.buffer.component}
					<Component paneId={pane.id}></Component>
				{/if}
				{#if pane.buffer instanceof NullBuffer}
					<ChapterContainer paneId={pane.id}></ChapterContainer>
				{/if}
			</div>
		</div>
	{:else if pane && pane.split !== PaneSplit.Null && pane.buffer instanceof NullBuffer}
		{#if pane.split === PaneSplit.Vertical}
			<div class="flex h-[100%] w-[100%] flex-row">
				<VerticalSplit {id} bind:pane></VerticalSplit>
			</div>
		{:else if pane.split === PaneSplit.Horizontal}
			<div class="flex h-[100%] w-[100%] flex-col">
				<HorizontalSplit {id} bind:pane></HorizontalSplit>
			</div>
		{/if}
	{/if}
</div>
