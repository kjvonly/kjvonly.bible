/**
 * UI-facing state for a Plans view that consumes the derived Plans projection.
 *
 * This intentionally describes what the view is waiting for rather than the
 * lifetime of a specific worker. A future on-demand worker can be acquired and
 * released behind the runtime boundary without changing view semantics.
 */
export type PlansViewLoadState =
	| 'initializing'
	| 'loading'
	| 'ready'
	| 'failure';
