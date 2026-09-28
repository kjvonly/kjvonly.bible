import type {
	NavigationStateValue,
	PaneNavigation
} from '$lib/application';

interface BibleLocationNavigationResultContext {
	navigation:
		Pick<
			PaneNavigation,
			'backWithResult'
		>;
	whenActive(
		handler: () => void | Promise<void>
	): () => void;
}

/**
 * Forwards a completed Bible-location selection through one mounted parent.
 *
 * backWithResult() delivers before the child is popped, so the parent waits
 * until it is active before returning the same result to its own parent.
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
