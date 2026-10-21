import { tick } from 'svelte';
import type { NormalizedContentBlockWindow } from './normalized-content-block-window';
import { determineNormalizedBlockWindowAdjustment } from './normalized-content-block-window-adjustment';
import { createNormalizedBlockWindowReconciliationQueue, createNormalizedBlockWindowScrollThrottle } from './normalized-content-block-window-reconciliation-scheduling';
import { captureNormalizedBlockWindowScrollAnchor, calculateNormalizedBlockWindowAnchorScrollDelta } from './normalized-content-block-window-scroll-anchor';
import type { NormalizedBlockWindowScrollAnchor } from './normalized-content-block-window-scroll-anchor';
import type { NormalizedBlockWindowAdjustment, NormalizedBlockWindowViewport } from './normalized-content-block-window-adjustment';

export interface NormalizedBlockWindowScrollHandle {
    /** Explicitly recheck after Reader activation or pane size changes. */
    reconcile(): void;
    destroy(): void;
}

/** Fired after the window restores its scroll anchor; it is not user scrolling. */
export const NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT = 'normalized-content-window-anchor-restored';

const SCROLL_THROTTLE_MS = 100;
const RENDER_BUDGET_MS = 1000;

/**
 * Event-driven height window around the visible portion of ViewBody.
 *
 * Each reconciliation renders or removes one canonical leaf at a time, then
 * measures DOM bounds. Scroll checks run at most 10 times per second; pane
 * dimensions arrive via reactive context. No DOM observers or polling loops.
 */
export function attachScrollAndReconcileNormalizedBlockWindow(
    root: HTMLElement,
    window: NormalizedContentBlockWindow,
    isActive: () => boolean
): NormalizedBlockWindowScrollHandle {
    const viewport = root.closest<HTMLElement>('[id$="-scroll-container"]');
    if (!viewport) {
        return { reconcile: () => {}, destroy: () => {} };
    }

    let disposed = false;

    // The navigation entry already knows whether this mounted Reader is active.
    // Avoid getClientRects()/clientHeight here: this guard runs per rendered leaf,
    // and asking for geometry can synchronously trigger browser layout.
    const canReconcile = (): boolean =>
        !disposed && root.isConnected && viewport.isConnected && isActive();

    /**
     * Browser-indexed ID lookup avoids walking the rendered subtree per block.
     * Identical documents can be displayed in multiple panes; only use the ID
     * match when it belongs to this Reader, otherwise use a scoped selector.
     */
    function findRenderedLeafElement(position: number): HTMLElement | null {
        const id = window.getLeafId(position);
        if (id === undefined) {
            return null;
        }
        const candidate = root.ownerDocument.getElementById(id);
        if (candidate && root.contains(candidate) &&
            candidate.getAttribute('data-normalized-window-index') === String(position)) {
            return candidate as HTMLElement;
        }
        return root.querySelector<HTMLElement>(`[data-normalized-window-index="${position}"]`);
    }

    /** Measure a single rendered leaf only when capture or restoration requires it. */
    function measureAnchorTop(position: number): number | undefined {
        return findRenderedLeafElement(position)?.getBoundingClientRect().top;
    }

    /** Mutate exactly one edge and await the corresponding Svelte DOM commit. */
    async function changeRangeAndAwaitRender(changeRange: () => boolean): Promise<boolean> {
        if (!changeRange()) {
            return false;
        }
        await tick();
        return true;
    }

    /** Restore the surviving anchor after a committed range change, if it moved. */
    function restoreScrollAnchor(anchor: NormalizedBlockWindowScrollAnchor): void {
        const adjustment = calculateNormalizedBlockWindowAnchorScrollDelta(anchor, measureAnchorTop);
        if (adjustment === undefined || adjustment === 0) {
            return;
        }
        viewport!.scrollTop += adjustment;
        // Scroll events caused by this correction arrive asynchronously.
        // Tell UI scroll consumers to reset their baseline synchronously.
        viewport!.dispatchEvent(new Event(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT));
    }

    /**
     * Prepend and remove-first move content above the viewport. Anchor to the
     * surviving old first/second leaf, rather than scanning for a visible one.
     * Never restore an anchor belonging to an invalidated reconciliation.
     */
    async function changeWindowRangeAndRestoreAnchor(
        changeRange: () => boolean,
        anchorPosition: number,
        canContinueReconciliation: () => boolean
    ): Promise<boolean> {
        const anchor = captureNormalizedBlockWindowScrollAnchor(anchorPosition, measureAnchorTop);
        if (!await changeRangeAndAwaitRender(changeRange)) {
            return false;
        }
        if (canContinueReconciliation() && anchor !== undefined) restoreScrollAnchor(anchor);
        return true;
    }

    /** Stable ViewBody geometry is measured once per reconciliation pass. */
    function measureViewport(): Omit<NormalizedBlockWindowViewport, 'scrollTop'> | undefined {
        const height = viewport!.clientHeight;
        if (height <= 0) {
            return;
        }
        const top = viewport!.getBoundingClientRect().top;
        return { top, bottom: top + height, height };
    }

    /** Applies the selected adjustment and waits for its Svelte DOM commit. */
    async function applyWindowAdjustment(
        adjustment: NormalizedBlockWindowAdjustment,
        canContinueReconciliation: () => boolean
    ): Promise<boolean> {
        switch (adjustment.kind) {
            case 'append':
                return changeRangeAndAwaitRender(() => window.append());
            case 'prepend':
                return changeWindowRangeAndRestoreAnchor(
                    () => window.prepend(), adjustment.anchorPosition, canContinueReconciliation
                );
            case 'removeFirst':
                return changeWindowRangeAndRestoreAnchor(
                    () => window.removeFirst(), adjustment.anchorPosition, canContinueReconciliation
                );
            case 'removeLast':
                return changeRangeAndAwaitRender(() => window.removeLast());
            case 'none':
                return false;
        }
    }

    /**
     * Reconciles initial fill, scrolling, and pane/font changes until no window
     * adjustment is needed or the existing rendering budget requires a yield.
     */
    async function measureAndReconcileWindow(): Promise<void> {
        const generation = window.getGeneration();
        const canContinueReconciliation = (): boolean => canReconcile() && window.getGeneration() === generation;
        await tick();
        // A reset or jump may have occurred while the Svelte DOM was pending.
        if (!canContinueReconciliation()) {
            return;
        }
        // ViewBody geometry is fixed during this pass; only leaf bounds change.
        const stableViewport = measureViewport();
        if (!stableViewport) {
            return;
        }
        const measureLeaf = (position: number) =>
            findRenderedLeafElement(position)?.getBoundingClientRect();
        let budgetStart = performance.now();
        while (canContinueReconciliation()) {
            const adjustment = determineNormalizedBlockWindowAdjustment(
                window.getRange(),
                { ...stableViewport, scrollTop: viewport!.scrollTop },
                measureLeaf
            );
            if (adjustment.kind === 'none') break;
            const progressed = await applyWindowAdjustment(adjustment, canContinueReconciliation);

            // Do not continue from the old geometry after an awaited DOM
            // commit, anchor correction, or explicit navigation change.
            if (!progressed || !canContinueReconciliation()) break;
            if (performance.now() - budgetStart >= RENDER_BUDGET_MS) {
                // Give the browser a paint opportunity with the currently
                // rendered blocks and the trailing accent spinner visible.
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => setTimeout(resolve, 0));
                });
                budgetStart = performance.now();
            }
        }
    }

    const reconciliationQueue = createNormalizedBlockWindowReconciliationQueue(
        canReconcile, measureAndReconcileWindow
    );
    const scrollThrottle = createNormalizedBlockWindowScrollThrottle(
        reconciliationQueue.request, canReconcile, SCROLL_THROTTLE_MS
    );

    viewport.addEventListener('scroll', scrollThrottle.onScroll, { passive: true });
    void tick().then(reconciliationQueue.request);

    return {
        reconcile: reconciliationQueue.request,
        destroy() {
            disposed = true;
            reconciliationQueue.destroy();
            scrollThrottle.destroy();
            viewport.removeEventListener('scroll', scrollThrottle.onScroll);
        }
    };
}
