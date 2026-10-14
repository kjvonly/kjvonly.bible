<!-- @component
Floating previous/next controls for a Reader-owned Resource sequence.
They use the existing ViewBody scroll container, appear on upward scrolling,
and fade away on downward scrolling while retaining top/bottom visibility.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import LeftChevron from '$lib/components/buttons/chevrons/leftChevron.svelte';
	import RightChevron from '$lib/components/buttons/chevrons/rightChevron.svelte';

	interface Props {
		/** Existing ViewBody scroll container (never creates a second scroller). */
		scrollContainerId: string;
		/** Current sequence position; a new document returns controls to view. */
		currentIndex: number;
		canPrevious: boolean;
		canNext: boolean;
		onPrevious: () => void;
		onNext: () => void;
	}

	let {
		scrollContainerId,
		currentIndex,
		canPrevious,
		canNext,
		onPrevious,
		onNext
	}: Props = $props();

	const BOTTOM_THRESHOLD = 40;
	const SCROLL_DIRECTION_THRESHOLD = 4;
	let visible = $state(true);
	let lastScrollTop = 0;
	let accumulatedScrollDelta = 0;

	onMount(() => {
		const scrollContainer = document.getElementById(scrollContainerId);
		if (!scrollContainer) {
			return;
		}

		lastScrollTop = scrollContainer.scrollTop;
		const updateVisibility = () => {
			const scrollTop = Math.max(0, scrollContainer.scrollTop);
			const delta = scrollTop - lastScrollTop;
			lastScrollTop = scrollTop;
			const remaining = scrollContainer.scrollHeight -
				scrollContainer.clientHeight - scrollTop;

			// Keep the controls available at either end of the document.
			if (scrollTop <= 0 || remaining <= BOTTOM_THRESHOLD) {
				visible = true;
				accumulatedScrollDelta = 0;
				return;
			}

			// Ignore tiny movements and reset the threshold on direction changes.
			if (delta === 0) {
				return;
			}
			if (Math.sign(delta) !== Math.sign(accumulatedScrollDelta)) {
				accumulatedScrollDelta = 0;
			}
			accumulatedScrollDelta += delta;
			if (Math.abs(accumulatedScrollDelta) >= SCROLL_DIRECTION_THRESHOLD) {
				visible = accumulatedScrollDelta < 0;
				accumulatedScrollDelta = 0;
			}
		};

		scrollContainer.addEventListener('scroll', updateVisibility, { passive: true });
		updateVisibility();
		return () => scrollContainer.removeEventListener('scroll', updateVisibility);
	});

	let previousIndex = currentIndex;
	$effect(() => {
		// Sequence changes reset ViewBody to the top; show the new document's controls.
		if (currentIndex !== previousIndex) {
			previousIndex = currentIndex;
			lastScrollTop = document.getElementById(scrollContainerId)?.scrollTop ?? 0;
			accumulatedScrollDelta = 0;
			visible = true;
		}
	});
</script>

{#if visible}
	<div
		class="pointer-events-none relative z-10 h-0 w-full"
		transition:fade={{ duration: 500 }}
	>
		<div class="pointer-events-auto absolute bottom-2 left-4">
			<LeftChevron
				ariaLabel="Previous document"
				disabled={!canPrevious}
				onClick={onPrevious}
			></LeftChevron>
		</div>
		<div class="pointer-events-auto absolute right-4 bottom-2">
			<RightChevron
				ariaLabel="Next document"
				disabled={!canNext}
				onClick={onNext}
			></RightChevron>
		</div>
	</div>
{/if}
