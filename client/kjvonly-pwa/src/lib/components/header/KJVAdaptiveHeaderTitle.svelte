<script lang="ts">
	import { KJVAdaptiveText } from '../text';

	let {
		longTitle,
		shortTitle = longTitle,
		secondary = undefined
	}: {
		longTitle: string;
		shortTitle?: string;
		secondary?: string;
	} = $props();
</script>

<span class="flex w-full min-w-0 flex-col leading-tight">
	<KJVAdaptiveText
		longText={longTitle}
		shortText={shortTitle}
		classes="text-base text-neutral-700"
	></KJVAdaptiveText>

	{#if secondary}
		<span class="truncate text-xs text-neutral-500">
			{secondary}
		</span>
	{/if}
</span>
