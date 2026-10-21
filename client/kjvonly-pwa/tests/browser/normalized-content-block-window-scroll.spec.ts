import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { NormalizedContentBlockWindow } from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-block-window';
import { NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, attachScrollAndReconcileNormalizedBlockWindow } from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-block-window-scroll';
import type { NormalizedDocument } from '@kjvonly/normalized-content';

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const node of mounted) node.remove();
    mounted.length = 0;
    vi.unstubAllGlobals();
});

/** Deterministic 100px blocks, without depending on headless-browser layout. */
function createViewport(options: { reflowOnWindowChange?: boolean; leafCount?: number } = {}): {
    window: NormalizedContentBlockWindow;
    viewport: HTMLElement;
    root: HTMLElement;
    setHeight(height: number): void;
    scrollTo(top: number): void;
    published(): number;
    viewportMeasurements(): { height: number; bounds: number };
} {
    const viewport = document.createElement('div');
    const root = document.createElement('div');
    viewport.id = 'reader-scroll-container';
    viewport.append(root);
    document.body.append(viewport);
    mounted.push(viewport);
    let height = 300;
    let heightReads = 0;
    let boundsReads = 0;
    Object.defineProperty(viewport, 'clientHeight', { get: () => { heightReads++; return height; } });
    Object.defineProperty(viewport, 'scrollTop', { value: 0, writable: true });
    viewport.getBoundingClientRect = () => {
        boundsReads++;
        return { top: 0, bottom: height } as DOMRect;
    };
    root.getClientRects = () => ({ length: height > 0 ? 1 : 0 } as DOMRectList);
    let publications = 0;
    const window = new NormalizedContentBlockWindow(({ indices }) => {
        publications++;
        root.replaceChildren();
        for (const [id, value] of indices) {
            const leaf = document.createElement('p');
            leaf.dataset.normalizedWindowIndex = String(value);
            leaf.id = id;
            leaf.getBoundingClientRect = () => ({
                top: (value - 1 - (options.reflowOnWindowChange ? window.getRange().start : 0)) * 100 - viewport.scrollTop,
                bottom: (value - (options.reflowOnWindowChange ? window.getRange().start : 0)) * 100 - viewport.scrollTop
            } as DOMRect);
            root.append(leaf);
        }
    });
    const source: NormalizedDocument = {
        blocks: Array.from({ length: options.leafCount ?? 60 }, (_, index) => ({
            type: 'paragraph' as const, id: `p-${index}`,
            content: [{ type: 'word' as const, text: String(index) }]
        }))
    };
    window.reset(source);
    return {
        window, viewport, root,
        published: () => publications,
        viewportMeasurements: () => ({ height: heightReads, bounds: boundsReads }),
        setHeight: (next) => { height = next; },
        scrollTo: (top) => {
            viewport.scrollTop = top;
            viewport.dispatchEvent(new Event('scroll'));
        }
    };
}

async function settle(): Promise<void> {
    await tick();
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
}

describe('Nested Reader window reconciliation', () => {
    it('settles an empty document without attempting to fill a nonexistent window', async () => {
        const state = createViewport({ leafCount: 0 });
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange()).toEqual({ start: 0, end: 0, total: 0 });
        expect(state.published()).toBe(1);
        state.scrollTo(400);
        handle.reconcile();
        await settle();
        expect(state.published()).toBe(1);
        handle.destroy();
    });

    it('settles a single-leaf document without appending or trimming', async () => {
        const state = createViewport({ leafCount: 1 });
        const append = vi.spyOn(state.window, 'append');
        const removeFirst = vi.spyOn(state.window, 'removeFirst');
        const removeLast = vi.spyOn(state.window, 'removeLast');
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange()).toEqual({ start: 0, end: 1, total: 1 });
        state.setHeight(500);
        state.scrollTo(200);
        handle.reconcile();
        await settle();
        expect(state.window.getRange()).toEqual({ start: 0, end: 1, total: 1 });
        expect(state.published()).toBe(1);
        expect(append).not.toHaveBeenCalled();
        expect(removeFirst).not.toHaveBeenCalled();
        expect(removeLast).not.toHaveBeenCalled();
        handle.destroy();
    });

    it('settles the initial three-screen window without repeatedly appending and trimming', async () => {
        const state = createViewport();
        const fullScans = vi.spyOn(state.root, 'querySelectorAll');
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange()).toEqual({ start: 0, end: 9, total: 60 });
        // One reset plus eight additional leaves. Without this guard the ninth
        // leaf is repeatedly mounted and removed for the full 1-second budget.
        expect(state.published()).toBe(9);
        expect(fullScans).not.toHaveBeenCalled();
        await settle();
        expect(state.published()).toBe(9);
        handle.destroy();
    });

    it('measures the stable viewport once per reconciliation, even when many leaves append', async () => {
        const state = createViewport();
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange().end).toBe(9);
        expect(state.viewportMeasurements()).toEqual({ height: 1, bounds: 1 });

        // Pane resizing explicitly requests a fresh measurement and more leaves.
        state.setHeight(500);
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(15);
        expect(state.viewportMeasurements()).toEqual({ height: 2, bounds: 2 });
        handle.destroy();
    });

    it('resolves leaf elements via IDs without querying the Reader subtree on a single pane', async () => {
        const state = createViewport();
        const queries = vi.spyOn(state.root, 'querySelector');
        const scans = vi.spyOn(state.root, 'querySelectorAll');
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange().end).toBe(9);
        expect(queries).not.toHaveBeenCalled();
        expect(scans).not.toHaveBeenCalled();
        state.scrollTo(500);
        await settle();
        expect(state.window.getRange().end).toBeGreaterThan(9);
        expect(queries).not.toHaveBeenCalled();
        handle.destroy();
    });

    it('uses the scoped fallback if another pane has the same block IDs', async () => {
        const first = createViewport();
        const second = createViewport();
        second.setHeight(500);
        const firstHandle = attachScrollAndReconcileNormalizedBlockWindow(first.root, first.window, () => true);
        await settle();
        const scopedLookup = vi.spyOn(second.root, 'querySelector');
        const secondHandle = attachScrollAndReconcileNormalizedBlockWindow(second.root, second.window, () => true);
        await settle();
        expect(first.window.getRange().end).toBe(9);
        expect(second.window.getRange().end).toBe(15);
        expect(scopedLookup).toHaveBeenCalled();
        firstHandle.destroy();
        secondHandle.destroy();
    });

    it('preserves the surviving first leaf position when prepending blocks above', async () => {
        const state = createViewport({ reflowOnWindowChange: true });
        state.window.prepareIndex(20);
        const initialPosition = state.root.querySelector<HTMLElement>(
            '[data-normalized-window-index="21"]'
        )!.getBoundingClientRect().top;
        const anchorEvents = vi.fn();
        state.viewport.addEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, anchorEvents);
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange().start).toBeLessThan(20);
        expect(state.viewport.scrollTop).toBeGreaterThan(0);
        expect(anchorEvents).toHaveBeenCalled();
        const anchored = state.root.querySelector<HTMLElement>(
            '[data-normalized-window-index="21"]'
        );
        expect(anchored?.getBoundingClientRect().top).toBe(initialPosition);
        handle.destroy();
    });

    it('does not emit anchor-restoration events when prepending leaves causes no layout movement', async () => {
        const state = createViewport();
        state.window.prepareIndex(20);
        const anchorEvents = vi.fn();
        state.viewport.addEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, anchorEvents);
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange().start).toBeLessThan(20);
        expect(state.viewport.scrollTop).toBe(0);
        expect(anchorEvents).not.toHaveBeenCalled();
        handle.destroy();
    });

    it('fills three screens initially, then extends only near the screen buffer', async () => {
        vi.stubGlobal('ResizeObserver', class {
            constructor() { throw new Error('No observers in the Reader'); }
        });
        const state = createViewport();
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(state.window.getRange().end).toBe(9);
        state.scrollTo(500);
        await settle();
        expect(state.window.getRange().end).toBeGreaterThan(9);
        handle.destroy();
    });

    it('uses navigation visibility without forcing a layout query per block', async () => {
        const state = createViewport();
        let active = true;
        const getClientRects = vi.spyOn(state.root, 'getClientRects')
            .mockImplementation(() => { throw new Error('Unexpected layout visibility check'); });
        const handle = attachScrollAndReconcileNormalizedBlockWindow(
            state.root, state.window, () => active
        );
        await settle();
        expect(state.window.getRange().end).toBe(9);

        active = false;
        state.scrollTo(500);
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(9);

        active = true;
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBeGreaterThan(9);
        expect(getClientRects).not.toHaveBeenCalled();
        handle.destroy();
    });

    it('stops reconciling a replaced document after the pending DOM commit', async () => {
        const state = createViewport();
        const append = state.window.append.bind(state.window);
        let replaced = false;
        vi.spyOn(state.window, 'append').mockImplementation(() => {
            const changed = append();
            if (!replaced) {
                replaced = true;
                // A new document is accepted while the old append awaits tick().
                state.window.reset({ blocks: Array.from({ length: 30 }, (_, index) => ({
                    type: 'paragraph' as const, id: `new-${index}`,
                    content: [{ type: 'word' as const, text: String(index) }]
                })) });
            }
            return changed;
        });
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(replaced).toBe(true);
        expect(state.window.getRange()).toEqual({ start: 0, end: 1, total: 30 });
        expect(state.root.querySelector('#new-0')).not.toBeNull();
        expect(state.root.querySelector('#p-1')).toBeNull();

        // The new Reader's reconciliation can now fill normally.
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(9);
        handle.destroy();
    });

    it('does not continue the old range after a Bookmark-style jump', async () => {
        const state = createViewport();
        const append = state.window.append.bind(state.window);
        let jumped = false;
        vi.spyOn(state.window, 'append').mockImplementation(() => {
            const changed = append();
            if (!jumped) {
                jumped = true;
                state.window.prepareIndex(20);
            }
            return changed;
        });
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(jumped).toBe(true);
        expect(state.window.getRange()).toEqual({ start: 20, end: 21, total: 60 });
        expect(state.root.querySelector('#p-20')).not.toBeNull();
        handle.destroy();
    });

    it('does not restore an obsolete scroll anchor after a jump', async () => {
        const state = createViewport({ reflowOnWindowChange: true });
        state.window.prepareIndex(20);
        const prepend = state.window.prepend.bind(state.window);
        let jumped = false;
        vi.spyOn(state.window, 'prepend').mockImplementation(() => {
            const changed = prepend();
            if (!jumped) {
                jumped = true;
                // Invalidate the old anchor after prepend(), before its tick().
                state.window.prepareIndex(20);
                state.viewport.scrollTop = 100;
            }
            return changed;
        });
        const anchorEvents = vi.fn();
        state.viewport.addEventListener(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT, anchorEvents);
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        expect(jumped).toBe(true);
        expect(state.window.getRange()).toEqual({ start: 20, end: 21, total: 60 });
        expect(state.viewport.scrollTop).toBe(100);
        expect(anchorEvents).not.toHaveBeenCalled();
        handle.destroy();
    });

    it('defers a pane resize while hidden and catches up on reactivation', async () => {
        const state = createViewport();
        let active = true;
        const handle = attachScrollAndReconcileNormalizedBlockWindow(
            state.root, state.window, () => active
        );
        await settle();
        expect(state.window.getRange().end).toBe(9);

        active = false;
        state.setHeight(500);
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(9);

        active = true;
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(15);
        handle.destroy();
    });

    it('rechecks after explicit pane resize and ignores hidden or disposed readers', async () => {
        const state = createViewport();
        const handle = attachScrollAndReconcileNormalizedBlockWindow(state.root, state.window, () => true);
        await settle();
        state.setHeight(500);
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(15);
        state.setHeight(0);
        const last = state.window.getRange().end;
        state.scrollTo(700);
        handle.reconcile();
        await settle();
        expect(state.window.getRange().end).toBe(last);
        handle.destroy();
        state.setHeight(900);
        state.scrollTo(800);
        await settle();
        expect(state.window.getRange().end).toBe(last);
    });
});
