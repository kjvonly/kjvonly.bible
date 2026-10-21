import { describe, expect, it, vi } from 'vitest';
import {
    captureNormalizedBlockWindowScrollAnchor,
    calculateNormalizedBlockWindowAnchorScrollDelta
} from './normalized-content-block-window-scroll-anchor';

describe('Normalized Reader scroll anchor geometry', () => {
    it('captures the original top for the surviving one-based leaf', () => {
        const measureTop = vi.fn(() => -125);
        expect(captureNormalizedBlockWindowScrollAnchor(21, measureTop)).toEqual({ position: 21, top: -125 });
        expect(measureTop).toHaveBeenCalledTimes(1);
        expect(measureTop).toHaveBeenCalledWith(21);
    });

    it('does not synthesize an anchor if the original leaf is absent', () => {
        expect(captureNormalizedBlockWindowScrollAnchor(21, () => undefined)).toBeUndefined();
    });

    it('calculates positive and negative scroll corrections from the same canonical leaf', () => {
        const anchor = { position: 21, top: 100 };
        const measureTop = vi.fn(() => 175);
        expect(calculateNormalizedBlockWindowAnchorScrollDelta(anchor, measureTop)).toBe(75);
        expect(measureTop).toHaveBeenCalledTimes(1);
        expect(measureTop).toHaveBeenCalledWith(21);
        expect(calculateNormalizedBlockWindowAnchorScrollDelta(anchor, () => 70)).toBe(-30);
    });

    it('returns zero if the leaf stays in place, without requiring an adjustment', () => {
        expect(calculateNormalizedBlockWindowAnchorScrollDelta(
            { position: 2, top: 0 }, () => 0
        )).toBe(0);
    });

    it('does not calculate a correction if the surviving leaf is unmounted', () => {
        expect(calculateNormalizedBlockWindowAnchorScrollDelta(
            { position: 21, top: 100 }, () => undefined
        )).toBeUndefined();
    });
});
