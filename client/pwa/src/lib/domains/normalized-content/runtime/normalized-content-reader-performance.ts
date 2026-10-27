/**
 * Opt-in, browser-only timing for document-open investigations. Enable with
 * `localStorage.setItem('kjvonly:reader-perf', '1')` and reload the application.
 * Disabled by default in both development and production builds.
 */
export function isNormalizedReaderProfilingEnabled(): boolean {
	try {
		return typeof window !== 'undefined' &&
			window.localStorage.getItem('kjvonly:reader-perf') === '1';
	} catch {
		// Private browsing or restricted storage must not affect Reader loading.
		return false;
	}
}

/** One scoped document-open timing report; no application state is persisted. */
export interface NormalizedReaderLoadProfile {
	/** Record the time since the preceding milestone and since loading began. */
	mark(stage: string): void;
	/** Record a nested synchronous operation without moving the milestone clock. */
	duration(stage: string, durationMs: number): void;
	/** Print the collected timings after the first render frame. */
	finish(): void;
}

let nextProfileId = 0;

/** Creates an inexpensive no-op (undefined) unless the developer opts in. */
export function createNormalizedReaderLoadProfile(): NormalizedReaderLoadProfile | undefined {
	if (!isNormalizedReaderProfilingEnabled()) return undefined;

	const startedAt = performance.now();
	let previousAt = startedAt;
	const profileId = ++nextProfileId;
	const rows: Array<{ stage: string; fromStartMs: number; durationMs: number }> = [];

	return {
		mark(stage) {
			const now = performance.now();
			rows.push({
				stage,
				fromStartMs: Math.round(now - startedAt),
				durationMs: Math.round(now - previousAt)
			});
			previousAt = now;
		},
		duration(stage, durationMs) {
			rows.push({
				stage,
				fromStartMs: Math.round(performance.now() - startedAt),
				durationMs: Math.round(durationMs)
			});
		},
		finish() {
			console.groupCollapsed(
				`[Normalized Reader perf #${profileId}] first frame: ${Math.round(performance.now() - startedAt)} ms`
			);
			console.table(rows);
			console.groupEnd();
		}
	};
}

/** Logs the IndexedDB-vs-Resource-install split inside the Domain service. */
export function logNormalizedReaderServiceDuration(
	stage: string,
	startedAt: number
): void {
	if (!isNormalizedReaderProfilingEnabled()) return;
	console.info(`[Normalized Reader perf] ${stage}: ${Math.round(performance.now() - startedAt)} ms`);
}
