<!--
@component
Low-level vertical range control used by scrubbed viewports.

This component owns only the scrubber's visual/input behavior: vertical range
orientation, enlarged thumb, interaction label, accessible range metadata, and
commit callback. It does not know about scroll containers, list items, loading,
or DOM lookup; those responsibilities belong to `KJVScrubbedViewport`.

```svelte
<KJVVerticalScrubber
	min={1}
	max={3000}
	bind:value={currentResult}
	label="Search result"
	formatValue={(value) => `Result ${value}`}
	onCommit={jumpToResult}
/>
```
-->
<script lang="ts">
	type Props = {
		/** Lowest selectable value. */
		min: number;
		/** Highest selectable value. */
		max: number;
		/** Current selected value. Bind to the owning viewport's local state. */
		value: number;
		/** Accessible name for the native range input. */
		label: string;
		/** Native range step. Defaults to 1. */
		step?: number;
		/** Formats the interaction bubble and `aria-valuetext`. */
		formatValue?: (value: number) => string;
		/** Called when the native range control commits a changed value. */
		onCommit?: (value: number) => void | Promise<void>;
	};

	let {
		min,
		max,
		value = $bindable(),
		label,
		step = 1,
		formatValue = (current: number) => String(current),
		onCommit
	}: Props = $props();

	let interacting = $state(false);

	/** Percentage used to keep the interaction bubble aligned with the thumb. */
	let positionPercent = $derived(
		max <= min
			? 0
			: ((value - min) / (max - min)) * 100
	);

	/** Commits the current bound range value to the owning viewport. */
	function onChange(): void {
		void onCommit?.(value);
	}
</script>

<div class="flex h-full w-10 shrink-0 items-center justify-center">
	<div class="relative h-3/4 w-full">
		{#if interacting}
			<div
				class="pointer-events-none absolute right-full z-20 mr-2 -translate-y-1/2 rounded-lg bg-neutral-800 px-2 py-1 text-xs text-nowrap text-neutral-50"
				style={`top: ${positionPercent}%`}
			>
				{formatValue(value)}
			</div>
		{/if}

		<input
			type="range"
			{min}
			{max}
			{step}
			bind:value
			aria-label={label}
			aria-orientation="vertical"
			aria-valuetext={formatValue(value)}
			onpointerdown={() => (interacting = true)}
			onpointerup={() => (interacting = false)}
			onpointercancel={() => (interacting = false)}
			onchange={onChange}
			class="scrubber h-full w-6 cursor-pointer accent-primary-500"
			style="writing-mode: vertical-lr; direction: ltr;"
		/>
	</div>
</div>

<style>
	.scrubber::-webkit-slider-thumb {
		transform: scale(1.333);
	}

	.scrubber::-moz-range-thumb {
		transform: scale(1.333);
	}
</style>
