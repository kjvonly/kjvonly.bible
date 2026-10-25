import { onMount } from 'svelte';
import { NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT } from './normalized-content-block-window-scroll';

interface FloatingControlsVisibilityContext {
	/** ID of the Pane-owned ViewBody scroll container; this hook never creates one. */
	scrollContainerId: string;
	currentIndex: () => number;
	showButtons: () => boolean;
	documentReady: () => boolean;
	/** These describe the full document, not just the currently rendered window. */
	atDocumentStart: () => boolean;
	atDocumentEnd: () => boolean;
}

const BOTTOM_THRESHOLD = 40;
const SCROLL_DIRECTION_THRESHOLD = 4;

/**
 * Shared visibility for floating navigation and document progress. Upward
 * scrolling reveals both; downward scrolling hides both. Ignore window-anchor
 * restorations, and reveal at the actual document edges or on a new document.
 *
 * Called once while mounting a Reader; owns one passive listener on its
 * existing Pane scroll container, not a scroll container or a separate timer.
 */
export function useNormalizedContentFloatingControlsVisibility(context: FloatingControlsVisibilityContext) {
	let visible = $state(true);
	let lastScrollTop = 0;
	let accumulatedScrollDelta = 0;

	const readScrollTop = () => Math.max(0, document.getElementById(context.scrollContainerId)?.scrollTop ?? 0);

	function reset(): void {
		lastScrollTop = readScrollTop();
		accumulatedScrollDelta = 0;
		visible = true;
	}

	onMount(() => {
		const viewport = document.getElementById(context.scrollContainerId);
		if (!viewport) return;

		lastScrollTop = Math.max(0, viewport.scrollTop);
		const resetAnchorBaseline = () => {
			lastScrollTop = Math.max(0, viewport.scrollTop);
			accumulatedScrollDelta = 0;
		};
		const updateVisibility = () => {
			const scrollTop = Math.max(0, viewport.scrollTop);
			const delta = scrollTop - lastScrollTop;
			lastScrollTop = scrollTop;
			const remaining = viewport.scrollHeight - viewport.clientHeight - scrollTop;

			// A windowed viewport's rendered edge is not necessarily the document edge.
			if ((context.atDocumentStart() && scrollTop <= 0) ||
				(context.atDocumentEnd() && remaining <= BOTTOM_THRESHOLD)) {
				visible = true;
				accumulatedScrollDelta = 0;
				return;
			}

			if (delta === 0) return;
			if (Math.sign(delta) !== Math.sign(accumulatedScrollDelta)) {
				accumulatedScrollDelta = 0;
			}
			accumulatedScrollDelta += delta;
			if (Math.abs(accumulatedScrollDelta) >= SCROLL_DIRECTION_THRESHOLD) {
				visible = accumulatedScrollDelta < 0;
				accumulatedScrollDelta = 0;
			}
		};

		viewport.addEventListener('scroll', updateVisibility, { passive: true });
		viewport.addEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, resetAnchorBaseline);
		updateVisibility();
		return () => {
			viewport.removeEventListener('scroll', updateVisibility);
			viewport.removeEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, resetAnchorBaseline);
		};
	});

	let previousIndex = context.currentIndex();
	let previousReady = context.documentReady();
	let previousShowButtons = context.showButtons();
	$effect(() => {
		const currentIndex = context.currentIndex();
		const ready = context.documentReady();
		const showButtons = context.showButtons();
		// Initial window work and returning to sequence navigation reveal controls.
		if (currentIndex !== previousIndex || (!previousReady && ready) ||
			(!previousShowButtons && showButtons)) {
			reset();
		}
		previousIndex = currentIndex;
		previousReady = ready;
		previousShowButtons = showButtons;
	});

	return {
		get visible(): boolean { return visible; }
	};
}
