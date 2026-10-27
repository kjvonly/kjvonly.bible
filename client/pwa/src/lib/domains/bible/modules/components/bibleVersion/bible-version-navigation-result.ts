import type {
	NavigationEntryContext,
	NavigationStateValue
} from '$lib/application';

import type {
	BibleVersion
} from '../../../models/bible-version.model';

export const BIBLE_VERSION_NAVIGATION_RESULT =
	'bible-version';

interface BibleVersionNavigationResultContext {
	whenActive:
		NavigationEntryContext['whenActive'];
	onVersionSelected(
		version: BibleVersion
	): void | Promise<void>;
}

/**
 * Creates the serializable navigation result returned by the shared Bible
 * version picker.
 */
export function createBibleVersionNavigationResult(
	version: BibleVersion
): NavigationStateValue {
	return {
		type: BIBLE_VERSION_NAVIGATION_RESULT,
		id: version.id,
		publisher: version.publisher,
		version: version.version
	};
}

/**
 * Handles a Bible-version result for the mounted parent navigation entry.
 *
 * backWithResult() delivers before the child entry is popped, so applying the
 * version waits until the parent entry is active again. The parent remains
 * responsible for deciding which Resource selections the version changes.
 */
export function handleBibleVersionNavigationResult(
	result: NavigationStateValue,
	context: BibleVersionNavigationResultContext
): boolean {
	const version =
		parseBibleVersionNavigationResult(
			result
		);

	if (!version) {
		return false;
	}

	context.whenActive(
		() => context.onVersionSelected(
			version
		)
	);

	return true;
}

/** Returns the Bible version carried by a valid navigation result. */
export function parseBibleVersionNavigationResult(
	result: NavigationStateValue
): BibleVersion | undefined {
	if (
		!isRecord(result) ||
		result.type !==
			BIBLE_VERSION_NAVIGATION_RESULT ||
		typeof result.id !== 'string' ||
		typeof result.publisher !== 'string' ||
		typeof result.version !== 'string'
	) {
		return undefined;
	}

	return {
		id: result.id,
		publisher: result.publisher,
		version: result.version
	};
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
