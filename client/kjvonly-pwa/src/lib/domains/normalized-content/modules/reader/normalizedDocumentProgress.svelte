<!-- @component Document-wide cumulative-text progress and scrubbing; ViewBody owns scrolling. -->
<script lang="ts">
	import { KJVVerticalScrubber } from '$lib/components/navigation';
	import { fade } from 'svelte/transition';

	const SCRUBBER_STEPS = 1000;

	let {
		progress,
		height,
		onSeek,
		visible = true
	}: {
		/** Fraction of cumulative document text above the visible viewport. */
		progress: number;
		/** Height of the Pane's existing scrollable body. */
		height: number;
		/** Request a position in the full document, not the currently mounted window. */
		onSeek: (progress: number) => void | Promise<void>;
		/** Visibility supplied by the shared Reader runtime (also used by Previous/Next). */
		visible?: boolean;
	} = $props();

	let scrubberValue = $state(0);

	$effect(() => {
		scrubberValue = Math.round(Math.max(0, Math.min(1, progress)) * SCRUBBER_STEPS);
	});
</script>

<div class="relative z-10 h-0 w-full">
	{#if visible}
		<div
			class="pointer-events-auto absolute right-0 bottom-0"
			style:height={`${Math.max(0, height)}px`}
			transition:fade={{ duration: 500 }}
		>
			<KJVVerticalScrubber
				min={0}
				max={SCRUBBER_STEPS}
				bind:value={scrubberValue}
				label="Document progress"
				formatValue={(value) => `${Math.round(value / 10)}%`}
				onCommit={(value) => onSeek(value / SCRUBBER_STEPS)}
			/>
		</div>
	{/if}
</div>
