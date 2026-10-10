import type {
	NavigationStateValue,
	PaneNavigation
} from '$lib/application';

/** Runtime capabilities required to forward a nested Bible-location result. */
interface BibleLocationNavigationResultContext {
	/** Navigation entry that receives the forwarded result. */
	navigation:
		Pick<
			PaneNavigation,
			'backWithResult'
		>;
	/**
	 * Defers work until this mounted navigation entry is active again.
	 *
	 * The returned cleanup cancels the pending callback when the entry is
	 * destroyed before becoming active.
	 */
	whenActive(
		handler: () => void | Promise<void>
	): () => void;
}

/**
 * Forwards a completed Bible-location selection through one mounted parent.
 *
 * backWithResult() delivers before the child is popped, so the parent waits
 * until it is active before returning the same result to its own parent.
 *
 * @param result - Navigation result returned by the child Bible selection view.
 * @param context - Parent navigation capabilities used to defer and forward it.
 * @returns `true` when the result is a Bible-location result owned by this flow.
 */
export function forwardBibleLocationNavigationResult(
	result: NavigationStateValue,
	context: BibleLocationNavigationResultContext
): boolean {
	if (!isBibleLocationNavigationResult(result)) {
		return false;
	}

	context.whenActive(
		() => context.navigation.backWithResult(result)
	);

	return true;
}

/** Returns whether a navigation result carries a canonical Bible location. */
function isBibleLocationNavigationResult(
	result: NavigationStateValue
): result is {
	[key: string]: NavigationStateValue;
	type: string;
	bibleLocationRef: string;
} {
	return (
		isRecord(result) &&
		result.type === 'bible-location' &&
		typeof result.bibleLocationRef === 'string'
	);
}

/** Narrows serialized navigation state to a non-array object. */
function isRecord(
	value: NavigationStateValue
): value is {
	[key: string]: NavigationStateValue;
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
