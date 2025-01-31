<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';
	import { NullBuffer } from '$lib/models/buffer.model';

	import VerticalSplit from './vertical-split.svelte';
	import HorizontalSplit from './horizontal-split.svelte';
	import ChapterContainer from '../../routes/(bible)/bible/components/chapterContainer.svelte';

	let _id = crypto.randomUUID();
	let { id ,  pane =$bindable<Pane>() } = $props();

	
</script>

<div id="_{id}-pane" class="h-full">
	{#if pane && pane.split === PaneSplit.Null}
		<div id="_{id}-buffer-pane" class="w-full h-[100%]">
			{#if !(pane.buffer instanceof NullBuffer)}
				{@const Component = pane.buffer.component}
			{/if}
			{#if pane.buffer instanceof NullBuffer}
				<ChapterContainer></ChapterContainer>
			{/if}
		</div>
	{:else if pane && pane.split !== PaneSplit.Null && pane.buffer instanceof NullBuffer}
		{#if pane.split === PaneSplit.Vertical}
			<VerticalSplit {id} bind:pane={pane}></VerticalSplit>
		{:else if pane.split === PaneSplit.Horizontal}
			<HorizontalSplit {id} bind:pane={pane}></HorizontalSplit>
		{/if}
	{/if}
</div>
