import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createNormalizedBlockWindowReconciliationQueue,
    createNormalizedBlockWindowScrollThrottle
} from './normalized-content-block-window-reconciliation-scheduling';

function deferred(): { promise: Promise<void>; resolve(): void } {
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => { resolve = complete; });
    return { promise, resolve };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('Normalized Reader reconciliation request queue', () => {
    it('runs immediately and coalesces repeated requests during an active pass', async () => {
        const first = deferred();
        const second = deferred();
        const reconcile = vi.fn()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(() => second.promise);
        const queue = createNormalizedBlockWindowReconciliationQueue(() => true, reconcile);

        queue.request();
        queue.request();
        queue.request();
        expect(reconcile).toHaveBeenCalledTimes(1);

        first.resolve();
        await first.promise;
        await Promise.resolve();
        expect(reconcile).toHaveBeenCalledTimes(2);

        second.resolve();
        await second.promise;
        await Promise.resolve();
        expect(reconcile).toHaveBeenCalledTimes(2);
        queue.destroy();
    });

    it('ignores requests while the Reader is inactive and resumes on explicit request', async () => {
        let active = false;
        const reconcile = vi.fn(async () => {});
        const queue = createNormalizedBlockWindowReconciliationQueue(() => active, reconcile);
        queue.request();
        expect(reconcile).not.toHaveBeenCalled();

        active = true;
        queue.request();
        expect(reconcile).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        queue.destroy();
    });

    it('does not flush a pending request after the Reader becomes inactive', async () => {
        const first = deferred();
        let active = true;
        const reconcile = vi.fn(() => first.promise);
        const queue = createNormalizedBlockWindowReconciliationQueue(() => active, reconcile);
        queue.request();
        queue.request();
        active = false;
        first.resolve();
        await first.promise;
        await Promise.resolve();
        expect(reconcile).toHaveBeenCalledTimes(1);
        queue.destroy();
    });

    it('does not replay stale pending work when an inactive Reader is reactivated', async () => {
        const first = deferred();
        let active = true;
        const reconcile = vi.fn()
            .mockImplementationOnce(() => first.promise)
            .mockResolvedValue(undefined);
        const queue = createNormalizedBlockWindowReconciliationQueue(() => active, reconcile);

        queue.request();
        queue.request(); // Queued while the first pass is in progress.
        active = false;
        first.resolve();
        await first.promise;
        await Promise.resolve();

        active = true;
        queue.request();
        expect(reconcile).toHaveBeenCalledTimes(2);
        await Promise.resolve();
        await Promise.resolve();
        expect(reconcile).toHaveBeenCalledTimes(2);
        queue.destroy();
    });

    it('reports a rejected pass and continues processing pending and later requests', async () => {
        const error = new Error('reconciliation failed');
        const report = vi.spyOn(console, 'error').mockImplementation(() => {});
        const reconcile = vi.fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValue(undefined);
        const queue = createNormalizedBlockWindowReconciliationQueue(() => true, reconcile);

        queue.request();
        queue.request();
        await Promise.resolve();
        await Promise.resolve();
        expect(report).toHaveBeenCalledWith('[Normalized Content Reader reconciliation failed]', error);
        expect(reconcile).toHaveBeenCalledTimes(2);

        await Promise.resolve();
        queue.request();
        expect(reconcile).toHaveBeenCalledTimes(3);
        await Promise.resolve();
        queue.destroy();
        report.mockRestore();
    });

    it('cancels pending work on destroy and ignores requests after disposal', async () => {
        const first = deferred();
        const reconcile = vi.fn(() => first.promise);
        const queue = createNormalizedBlockWindowReconciliationQueue(() => true, reconcile);
        queue.request();
        queue.request();
        queue.destroy();
        first.resolve();
        await first.promise;
        await Promise.resolve();
        queue.request();
        expect(reconcile).toHaveBeenCalledTimes(1);
    });
});

describe('Normalized Reader scroll throttle', () => {
    it('fires immediately and schedules exactly one trailing check for a burst', () => {
        vi.useFakeTimers();
        let now = 1000;
        const request = vi.fn();
        const throttle = createNormalizedBlockWindowScrollThrottle(request, () => true, 100, () => now);
        throttle.onScroll();
        expect(request).toHaveBeenCalledTimes(1);

        now = 1020;
        throttle.onScroll();
        now = 1070;
        throttle.onScroll();
        expect(request).toHaveBeenCalledTimes(1);
        now = 1100;
        vi.advanceTimersByTime(80);
        expect(request).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(200);
        expect(request).toHaveBeenCalledTimes(2);
        throttle.destroy();
    });

    it('does not throttle explicit requests and skips scroll while inactive', () => {
        vi.useFakeTimers();
        let now = 1000;
        let active = true;
        const request = vi.fn();
        const throttle = createNormalizedBlockWindowScrollThrottle(request, () => active, 100, () => now);
        throttle.onScroll();
        active = false;
        now = 1020;
        throttle.onScroll();
        expect(request).toHaveBeenCalledTimes(1);

        // The caller's explicit activation/resize request is not routed through the throttle.
        request();
        expect(request).toHaveBeenCalledTimes(2);
        active = true;
        now = 1100;
        throttle.onScroll();
        expect(request).toHaveBeenCalledTimes(3);
        throttle.destroy();
    });

    it('cancels the trailing timer and ignores later scroll events on destroy', () => {
        vi.useFakeTimers();
        let now = 1000;
        const request = vi.fn();
        const throttle = createNormalizedBlockWindowScrollThrottle(request, () => true, 100, () => now);
        throttle.onScroll();
        now = 1010;
        throttle.onScroll();
        expect(vi.getTimerCount()).toBe(1);
        throttle.destroy();
        expect(vi.getTimerCount()).toBe(0);
        now = 1100;
        vi.advanceTimersByTime(200);
        throttle.onScroll();
        expect(request).toHaveBeenCalledTimes(1);
    });
});
