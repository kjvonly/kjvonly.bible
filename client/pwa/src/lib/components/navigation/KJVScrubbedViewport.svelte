<!--
@component
Generic scroll viewport for long, ordered collections with an overlaid vertical scrubber.

Rows that participate in scrubbing must expose a numeric
`data-kjv-scrubber-value` attribute. Row lookup is scoped to this component's
local scroll container, so multiple panes may use the same scrubber values
without colliding.

The scrubber appears only when the configured item-count threshold is met,
becomes visible during scroll/scrub activity, and fades after inactivity.
`prepareValue` can make a requested target renderable before the viewport jumps
to it. `onReachStart` and `onReachEnd` support bidirectional windowing; the
viewport preserves the first visible row while content is prepended, appended,
or trimmed around it. Pair large asynchronous collections with `ScrubbedWindow`
to reuse bounded prepend/append/trim and distant-jump behavior.

```svelte
<KJVScrubbedViewport
	min={1}
	max={results.length}
	bind:value={currentResult}
	label="Search result"
	onReachStart={loadPrevious}
	onReachEnd={loadNext}
>
	{#each visibleResults as result, index}
		<div data-kjv-scrubber-value={index + 1}>
			{result.title}
		</div>
	{/each}
</KJVScrubbedViewport>
```
-->
<script lang="ts">
	import { onDestroy, tick, type Snippet } from 'svelte';

	import KJVVerticalScrubber from './KJVVerticalScrubber.svelte';

	import uuid4 from 'uuid4';

	const DEFAULT_MINIMUM_ITEM_COUNT = 40;
	const DEFAULT_AUTO_HIDE_DELAY_MS = 3000;
	const SCROLL_BOUNDARY_THRESHOLD_PX = 20;

	type Props = {
		/** Lowest value represented by the scrubber. */
		min: number;
		/** Highest value represented by the scrubber. */
		max: number;
		/** Current scrubber value. Bind this to the owning view's local state. */
		value: number;
		/** Accessible label describing what the scrubber navigates. */
		label: string;
		/** Explicitly enables or disables scrubber rendering. Defaults to `true`. */
		showScrubber?: boolean;
		/**
		 * Minimum inclusive range size required before the scrubber is rendered.
		 * Defaults to 40 so short collections remain visually simple.
		 */
		minimumItemCount?: number;
		/**
		 * Milliseconds the scrubber remains visible after scroll/scrub activity.
		 * Set below zero to disable automatic hiding. Defaults to 3000 ms.
		 */
		autoHideDelayMs?: number;
		/** Formats the current value for the scrubber's visible and ARIA labels. */
		formatValue?: (value: number) => string;
		/**
		 * Called while scrolling upward when the local viewport reaches its upper
		 * edge. The current visible row is preserved if content is prepended or
		 * trimmed during the callback.
		 */
		onReachStart?: () => void | Promise<void>;
		/**
		 * Called while scrolling downward when the local viewport reaches its lower
		 * edge. The current visible row is preserved if content is appended or
		 * trimmed during the callback.
		 */
		onReachEnd?: () => void | Promise<void>;
		/**
		 * Makes a requested value available before the viewport jumps to it.
		 * Return the actual local value to target, or `undefined` to cancel.
		 */
		prepareValue?: (
			value: number
		) => number | undefined | Promise<number | undefined>;
		/** Scrollable collection content. */
		children: Snippet;
	};

	type ScrollAnchor = {
		value: number;
		offsetTop: number;
	};

	let {
		min,
		max,
		value = $bindable(),
		label,
		showScrubber = true,
		minimumItemCount = DEFAULT_MINIMUM_ITEM_COUNT,
		autoHideDelayMs = DEFAULT_AUTO_HIDE_DELAY_MS,
		formatValue = (current: number) => String(current),
		onReachStart = undefined,
		onReachEnd = undefined,
		prepareValue = undefined,
		children
	}: Props = $props();

	/**
	 * Unique DOM identity for this viewport instance. Behavior never relies on a
	 * global lookup; all row queries are scoped through `scrollContainer`.
	 */
	const viewportID = uuid4();
	let scrollContainer: HTMLElement | undefined = $state();
	let loadingBoundary = false;
	let previousScrollTop = 0;
	let scrubberVisible = $state(false);
	let scrubberInteracting = false;
	let hideScrubberTimer: ReturnType<typeof setTimeout> | undefined;

	let scrubbableItemCount = $derived(
		max >= min
			? Math.floor(max - min) + 1
			: 0
	);
	let scrubberEnabled = $derived(
		showScrubber &&
		scrubbableItemCount >= Math.max(1, minimumItemCount)
	);

	onDestroy(() => {
		clearHideScrubberTimer();
	});

	/** Clears any pending inactivity hide without changing current visibility. */
	function clearHideScrubberTimer(): void {
		if (hideScrubberTimer === undefined) {
			return;
		}

		clearTimeout(hideScrubberTimer);
		hideScrubberTimer = undefined;
	}

	/** Starts/restarts the inactivity timer when auto-hide is applicable. */
	function scheduleHideScrubber(): void {
		clearHideScrubberTimer();

		if (
			!scrubberEnabled ||
			scrubberInteracting ||
			autoHideDelayMs < 0
		) {
			return;
		}

		hideScrubberTimer = setTimeout(() => {
			scrubberVisible = false;
			hideScrubberTimer = undefined;
		}, autoHideDelayMs);
	}

	/** Reveals the scrubber for viewport activity and refreshes auto-hide. */
	function revealScrubber(): void {
		if (!scrubberEnabled) {
			return;
		}

		scrubberVisible = true;
		scheduleHideScrubber();
	}

	/** Keeps the scrubber visible while pointer or keyboard interaction is active. */
	function onScrubberInteractionStart(): void {
		if (!scrubberEnabled) {
			return;
		}

		scrubberInteracting = true;
		clearHideScrubberTimer();
		scrubberVisible = true;
	}

	/** Restarts auto-hide after pointer or keyboard interaction ends. */
	function onScrubberInteractionEnd(): void {
		scrubberInteracting = false;
		scheduleHideScrubber();
	}

	/**
	 * Keeps wheel input over the scrubber inside this viewport. The scrubber
	 * overlay is a sibling of the scroll container, so unhandled wheel events
	 * would otherwise bubble to an outer pane scroll surface.
	 */
	function onScrubberWheel(event: WheelEvent): void {
		const container = scrollContainer;
		if (!container) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		let deltaY = event.deltaY;
		if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
			deltaY *= 16;
		} else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
			deltaY *= container.clientHeight;
		}

		container.scrollTop += deltaY;
	}

	/**
	 * Keeps the scrubber synchronized with the first visible scrubbable item and
	 * invokes only the boundary matching the user's current scroll direction.
	 */
	async function onScroll(): Promise<void> {
		const container = scrollContainer;
		if (!container) {
			return;
		}

		const currentScrollTop = container.scrollTop;
		const scrollingUp = currentScrollTop < previousScrollTop;
		const scrollingDown = currentScrollTop > previousScrollTop;
		previousScrollTop = currentScrollTop;

		revealScrubber();
		updateValueFromScroll(container);

		if (loadingBoundary) {
			return;
		}

		const reachedStart =
			container.scrollTop <= SCROLL_BOUNDARY_THRESHOLD_PX;
		const reachedEnd =
			container.scrollHeight -
			container.clientHeight -
			container.scrollTop <= SCROLL_BOUNDARY_THRESHOLD_PX;

		if (scrollingUp && reachedStart && onReachStart) {
			await loadAtBoundary(container, onReachStart);
			return;
		}

		if (scrollingDown && reachedEnd && onReachEnd) {
			await loadAtBoundary(container, onReachEnd);
		}
	}

	/**
	 * Runs a windowing callback while keeping the current visible item at the same
	 * pixel offset. This allows callers to prepend and trim rows without a jump.
	 */
	async function loadAtBoundary(
		container: HTMLElement,
		load: () => void | Promise<void>
	): Promise<void> {
		loadingBoundary = true;
		const anchor = captureScrollAnchor(container);

		try {
			await load();
			await tick();
			restoreScrollAnchor(container, anchor);
		} finally {
			previousScrollTop = container.scrollTop;
			loadingBoundary = false;
		}
	}

	/** Captures the first visible row and its pixel offset inside this viewport. */
	function captureScrollAnchor(
		container: HTMLElement
	): ScrollAnchor | undefined {
		const containerTop =
			container.getBoundingClientRect().top;
		const rows =
			container.querySelectorAll<HTMLElement>(
				'[data-kjv-scrubber-value]'
			);

		for (const row of rows) {
			const rowRect = row.getBoundingClientRect();
			if (rowRect.bottom <= containerTop + 8) {
				continue;
			}

			const rowValue = Number(
				row.dataset.kjvScrubberValue
			);
			if (!Number.isFinite(rowValue)) {
				return;
			}

			return {
				value: rowValue,
				offsetTop: rowRect.top - containerTop
			};
		}
	}

	/** Restores a captured row to its previous pixel offset after window changes. */
	function restoreScrollAnchor(
		container: HTMLElement,
		anchor: ScrollAnchor | undefined
	): void {
		if (!anchor) {
			return;
		}

		const row = container.querySelector<HTMLElement>(
			`[data-kjv-scrubber-value="${anchor.value}"]`
		);
		if (!row) {
			return;
		}

		const containerTop =
			container.getBoundingClientRect().top;
		const currentOffset =
			row.getBoundingClientRect().top - containerTop;

		container.scrollTop +=
			currentOffset - anchor.offsetTop;
	}

	/**
	 * Reads only rows inside this viewport and adopts the first visible row's
	 * `data-kjv-scrubber-value` as the current scrubber value.
	 */
	function updateValueFromScroll(
		container: HTMLElement
	): void {
		const anchor = captureScrollAnchor(container);
		if (anchor) {
			value = anchor.value;
		}
	}

	/**
	 * Gives the owning view a chance to render/resolve a requested value, then
	 * scrolls only this viewport to the matching local item.
	 */
	async function onScrubberCommit(
		requestedValue: number
	): Promise<void> {
		let targetValue = requestedValue;

		if (prepareValue) {
			const preparedValue =
				await prepareValue(requestedValue);
			if (preparedValue === undefined) {
				return;
			}
			targetValue = preparedValue;
		}

		await tick();

		const container = scrollContainer;
		if (!container) {
			return;
		}

		const row = container.querySelector<HTMLElement>(
			`[data-kjv-scrubber-value="${targetValue}"]`
		);
		if (!row) {
			return;
		}

		const containerRect =
			container.getBoundingClientRect();
		const rowRect =
			row.getBoundingClientRect();
		container.scrollTop +=
			rowRect.top - containerRect.top;
		previousScrollTop = container.scrollTop;
		value = targetValue;
		revealScrubber();
	}
</script>

<div class="relative min-h-0 min-w-0 flex-1">
	<div
		id={`${viewportID}-scroll-container`}
		bind:this={scrollContainer}
		onscroll={() => void onScroll()}
		class="h-full min-h-0 min-w-0 overflow-y-auto"
	>
		{@render children()}
	</div>

	{#if scrubberEnabled}
		<div
			class={`absolute inset-y-0 right-0 z-10 transition-opacity duration-300 ${scrubberVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
			onpointerdown={onScrubberInteractionStart}
			onpointerup={onScrubberInteractionEnd}
			onpointercancel={onScrubberInteractionEnd}
			onfocusin={onScrubberInteractionStart}
			onfocusout={onScrubberInteractionEnd}
			onwheel={onScrubberWheel}
		>
			<KJVVerticalScrubber
				{min}
				{max}
				bind:value
				{label}
				{formatValue}
				onCommit={onScrubberCommit}
			></KJVVerticalScrubber>
		</div>
	{/if}
</div>
