<!-- @component
Floating previous/next controls for a Reader-owned Resource sequence.
They use the existing ViewBody scroll container, start visible, appear on
upward scrolling, and fade after actual downward scrolling. Window scroll-anchor
corrections must not be interpreted as user scroll direction.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import LeftChevron from '$lib/components/buttons/chevrons/leftChevron.svelte';
	import RightChevron from '$lib/components/buttons/chevrons/rightChevron.svelte';
	import { NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT } from './runtime/normalized-content-block-window-scroll';

	interface Props {
		/** Existing ViewBody scroll container (never creates a second scroller). */
		scrollContainerId: string;
		/** Current sequence position; a new document returns controls to view. */
		currentIndex: number;
		canPrevious: boolean;
		canNext: boolean;
		/** Reset initial button visibility when the Reader finishes loading. */
		documentReady: boolean;
		/** True only when the current DOM window includes the document's first leaf. */
		atDocumentStart: boolean;
		/** True only when the current DOM window includes the document's final leaf. */
		atDocumentEnd: boolean;
		onPrevious: () => void;
		onNext: () => void;
	}

	let {
		scrollContainerId,
		currentIndex,
		canPrevious,
		canNext,
		documentReady,
		atDocumentStart,
		atDocumentEnd,
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
		// Height-window corrections preserve the visible word, not user direction.
		const resetAnchorBaseline = () => {
			lastScrollTop = Math.max(0, scrollContainer.scrollTop);
			accumulatedScrollDelta = 0;
		};
		const updateVisibility = () => {
			const scrollTop = Math.max(0, scrollContainer.scrollTop);
			const delta = scrollTop - lastScrollTop;
			lastScrollTop = scrollTop;
			const remaining = scrollContainer.scrollHeight -
				scrollContainer.clientHeight - scrollTop;

			// A bounded window can reach its *rendered* edge before the actual
			// document edge. Only the latter should force the controls visible.
			if ((atDocumentStart && scrollTop <= 0) ||
				(atDocumentEnd && remaining <= BOTTOM_THRESHOLD)) {
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
		scrollContainer.addEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, resetAnchorBaseline);
        updateVisibility();
		return () => {
			scrollContainer.removeEventListener('scroll', updateVisibility);
			scrollContainer.removeEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, resetAnchorBaseline);
        };
	});

	let previousIndex = currentIndex;
	let previousReady = documentReady;
	$effect(() => {
		const ready = documentReady;
		// Initial window work must not leave new-document controls hidden.
		if (currentIndex !== previousIndex || (!previousReady && ready)) {
			previousIndex = currentIndex;
			lastScrollTop = document.getElementById(scrollContainerId)?.scrollTop ?? 0;
			accumulatedScrollDelta = 0;
			visible = true;
		}
		previousReady = ready;
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
