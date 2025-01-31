<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';
	import { NullBuffer } from '$lib/models/buffer.model';

	import VerticalSplit from './vertical-split.svelte';
	import HorizontalSplit from './horizontal-split.svelte';
	import ChapterContainer from '../../routes/(bible)/bible/components/chapterContainer.svelte';

	let _id = crypto.randomUUID();
	let { id, pane = $bindable<Pane>() } = $props();
</script>

<div id="_{id}-pane" class="h-full w-full">
	{#if pane && pane.split === PaneSplit.Null}
		<div id="_{id}-buffer-pane" class="h-[100%] w-full">
			{#if !(pane.buffer instanceof NullBuffer)}
				{@const Component = pane.buffer.component}
			{/if}
			{#if pane.buffer instanceof NullBuffer}
				<ChapterContainer></ChapterContainer>
			{/if}
		</div>
	{:else if pane && pane.split !== PaneSplit.Null && pane.buffer instanceof NullBuffer}
		{#if pane.split === PaneSplit.Vertical}
			<div class="flex flex-row w-[100%] h-[100%]">
				<VerticalSplit {id} bind:pane></VerticalSplit>
			</div>
		{:else if pane.split === PaneSplit.Horizontal}
			<div class="flex flex-col  w-[100%] h-[100%]">
				<HorizontalSplit {id} bind:pane></HorizontalSplit>
			</div>
		{/if}
	{/if}
</div>
