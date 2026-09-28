<script lang="ts">
	let {
		longTitle,
		shortTitle = longTitle,
		secondary = undefined
	}: {
		longTitle: string;
		shortTitle?: string;
		secondary?: string;
	} = $props();

	let availableWidth = $state(0);
	let longTitleWidth = $state(0);

	let title = $derived(
		availableWidth === 0 ||
		longTitleWidth === 0 ||
		longTitleWidth <= availableWidth
			? longTitle
			: shortTitle
	);
</script>

<span
	bind:clientWidth={availableWidth}
	class="relative flex w-full min-w-0 flex-col leading-tight"
>
	<span
		bind:clientWidth={longTitleWidth}
		aria-hidden="true"
		class="pointer-events-none absolute invisible w-max whitespace-nowrap text-base text-neutral-700"
	>
		{longTitle}
	</span>

	<span class="truncate text-base text-neutral-700">
		{title}
	</span>

	{#if secondary}
		<span class="truncate text-xs text-neutral-500">
			{secondary}
		</span>
	{/if}
</span>
