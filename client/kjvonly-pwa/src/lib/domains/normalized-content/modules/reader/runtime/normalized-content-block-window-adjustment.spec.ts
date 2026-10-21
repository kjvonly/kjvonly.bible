import { describe, expect, it, vi } from 'vitest';
import { determineNormalizedBlockWindowAdjustment } from './normalized-content-block-window-adjustment';
import type {
    NormalizedBlockWindowLeafBounds,
    NormalizedBlockWindowRange,
    NormalizedBlockWindowViewport
} from './normalized-content-block-window-adjustment';

const viewport: NormalizedBlockWindowViewport = {
    top: 0, bottom: 300, height: 300, scrollTop: 0
};

/** Each canonical leaf is 100px high; scrollTop changes its screen position. */
function measuredLeaves(scrollTop = 0): (position: number) => NormalizedBlockWindowLeafBounds {
    return (position) => ({
        top: (position - 1) * 100 - scrollTop,
        bottom: position * 100 - scrollTop
    });
}

function decide(
    range: NormalizedBlockWindowRange,
    overrides: Partial<NormalizedBlockWindowViewport> = {},
    measureLeaf = measuredLeaves(overrides.scrollTop ?? 0)
) {
    return determineNormalizedBlockWindowAdjustment(range, { ...viewport, ...overrides }, measureLeaf);
}

describe('Normalized Reader window adjustment policy', () => {
    it('fills two screens beneath an initially visible top without trimming', () => {
        expect(decide({ start: 0, end: 1, total: 60 })).toEqual({ kind: 'append' });
        expect(decide({ start: 0, end: 8, total: 60 })).toEqual({ kind: 'append' });
        expect(decide({ start: 0, end: 9, total: 60 })).toEqual({ kind: 'none' });
    });

    it('extends the lower edge only when the scrolled buffer is below half a screen', () => {
        const range = { start: 0, end: 9, total: 60 };
        expect(decide(range, { scrollTop: 451 })).toEqual({ kind: 'append' });
        expect(decide(range, { scrollTop: 450 })).toEqual({ kind: 'none' });
    });

    it('prepends near the upper edge and anchors the surviving first leaf', () => {
        expect(decide({ start: 20, end: 21, total: 60 })).toEqual({
            kind: 'prepend', anchorPosition: 21
        });
    });

    it('trims the first leaf only when the next leaf is more than a screen above', () => {
        const range = { start: 4, end: 60, total: 60 };
        expect(decide(range, { scrollTop: 1800 })).toEqual({
            kind: 'removeFirst', anchorPosition: 6
        });
        const measureAtEdge = (position: number) => {
            if (position === 5) {
                return { top: -301, bottom: -201 };
            }
            if (position === 6) {
                return { top: -400, bottom: -300 }; // strict inequality
            }
            return { top: 0, bottom: 500 };
        };
        expect(decide(range, { scrollTop: 10 }, measureAtEdge)).toEqual({ kind: 'none' });
    });

    it('trims the last leaf only when it lies beyond the lower buffer', () => {
        const range = { start: 0, end: 60, total: 60 };
        expect(decide(range, { scrollTop: 300 })).toEqual({ kind: 'removeLast' });
        // Never trim the final leaf of a single-leaf window.
        expect(decide({ start: 0, end: 1, total: 1 }, { scrollTop: 300 })).toEqual({ kind: 'none' });
    });

    it('does not reconcile invalid, empty, or unmeasurable windows', () => {
        const missingLeaf = vi.fn(() => undefined);
        expect(decide({ start: 0, end: 0, total: 0 }, {}, missingLeaf)).toEqual({ kind: 'none' });
        expect(decide({ start: 5, end: 5, total: 60 }, {}, missingLeaf)).toEqual({ kind: 'none' });
        expect(decide({ start: 0, end: 1, total: 60 }, { height: 0 }, missingLeaf)).toEqual({ kind: 'none' });
        expect(missingLeaf).not.toHaveBeenCalled();
        expect(decide({ start: 0, end: 1, total: 60 }, {}, missingLeaf)).toEqual({ kind: 'none' });
        expect(missingLeaf.mock.calls).toEqual([[1]]);
    });

    it('does not measure more leaves than the chosen operation requires', () => {
        const appendReads = vi.fn(measuredLeaves());
        expect(decide({ start: 0, end: 1, total: 60 }, {}, appendReads)).toEqual({ kind: 'append' });
        expect(appendReads.mock.calls.map(([position]) => position)).toEqual([1]);

        const prependReads = vi.fn(measuredLeaves());
        expect(decide({ start: 20, end: 21, total: 60 }, {}, prependReads)).toEqual({
            kind: 'prepend', anchorPosition: 21
        });
        expect(prependReads.mock.calls.map(([position]) => position)).toEqual([21, 21]);

        const trimReads = vi.fn(measuredLeaves(300));
        expect(decide({ start: 0, end: 60, total: 60 }, { scrollTop: 300 }, trimReads)).toEqual({ kind: 'removeLast' });
        expect(trimReads.mock.calls.map(([position]) => position)).toEqual([60, 1, 59]);
    });

    it('stops if the lower leaf exists but the upper leaf is not mounted yet', () => {
        const measured = vi.fn((position: number) =>
            position === 9 ? { top: 800, bottom: 900 } : undefined
        );
        expect(decide({ start: 0, end: 9, total: 60 }, {}, measured)).toEqual({ kind: 'none' });
        expect(measured.mock.calls.map(([position]) => position)).toEqual([9, 1]);
    });
});
