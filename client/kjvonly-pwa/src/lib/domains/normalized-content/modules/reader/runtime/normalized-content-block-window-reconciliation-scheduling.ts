/**
 * Serializes reconciliation passes and coalesces requests arriving mid-pass.
 * Pending work is discarded when the Reader can no longer reconcile; a later
 * activation must explicitly request a fresh pass.
 */
export function createNormalizedBlockWindowReconciliationQueue(
    canReconcile: () => boolean,
    reconcile: () => Promise<void>
): { request(): void; destroy(): void } {
    let running = false;
    let pending = false;
    let disposed = false;

    async function runAndFlushPending(): Promise<void> {
        running = true;
        try {
            await reconcile();
        } catch (error) {
            // Requests are fire-and-forget, so report failures here rather than
            // allowing an unhandled rejection to escape the scheduler.
            console.error('[Normalized Content Reader reconciliation failed]', error);
        } finally {
            const flushPending = pending && !disposed && canReconcile();
            pending = false;
            running = false;
            if (flushPending) void runAndFlushPending();
        }
    }

    return {
        request() {
            if (disposed || !canReconcile()) {
                return;
            }
            if (running) {
                pending = true;
                return;
            }
            void runAndFlushPending();
        },
        destroy() {
            disposed = true;
            pending = false;
        }
    };
}

/**
 * Preserves the leading scroll check and one trailing check per burst.
 * Explicit reconciliation requests bypass throttling; only scroll events use it.
 */
export function createNormalizedBlockWindowScrollThrottle(
    requestReconciliation: () => void,
    canReconcile: () => boolean,
    throttleMs: number,
    now: () => number = () => performance.now()
): { onScroll(): void; destroy(): void } {
    let lastScrollCheck = -Infinity;
    let trailingCheck: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    return {
        onScroll() {
            if (disposed || !canReconcile()) {
                return;
            }
            const currentTime = now();
            const remaining = throttleMs - (currentTime - lastScrollCheck);
            if (remaining <= 0) {
                if (trailingCheck !== undefined) clearTimeout(trailingCheck);
                trailingCheck = undefined;
                lastScrollCheck = currentTime;
                requestReconciliation();
            } else if (trailingCheck === undefined) {
                // Preserve the final scroll position when events arrive in a burst.
                trailingCheck = setTimeout(() => {
                    trailingCheck = undefined;
                    lastScrollCheck = now();
                    requestReconciliation();
                }, remaining);
            }
        },
        destroy() {
            disposed = true;
            if (trailingCheck !== undefined) clearTimeout(trailingCheck);
            trailingCheck = undefined;
        }
    };
}
