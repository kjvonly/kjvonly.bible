<script lang="ts">
	let {
		longText,
		shortText = longText,
		wrap = false,
		classes = ''
	}: {
		longText: string;
		shortText?: string;
		wrap?: boolean;
		classes?: string;
	} = $props();

	let availableWidth = $state(0);
	let longTextWidth = $state(0);

	let text = $derived(
		availableWidth === 0 ||
		longTextWidth === 0 ||
		longTextWidth <= availableWidth
			? longText
			: shortText
	);
</script>

<span
	bind:clientWidth={availableWidth}
	class="relative block w-full min-w-0"
>
	<span
		bind:clientWidth={longTextWidth}
		aria-hidden="true"
		class={`pointer-events-none absolute invisible w-max whitespace-nowrap ${classes}`}
	>
		{longText}
	</span>

	<span
		class={`${wrap ? 'whitespace-normal break-words' : 'truncate'} ${classes}`}
	>
		{text}
	</span>
</span>
