import type { ResourceDataTypeHandler } from '$lib/resource';
import { parseBookmarkDisplayMetadata } from '../services/bookmark-metadata';
import { parseBookmarkTarget } from '../services/bookmark-target-validation';
import {
	BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION,
	type BookmarkResourceContent
} from './bookmarks-resource-contract';

/** Validate the current Bookmark Resource contract with display metadata. */
export class BookmarkDataTypeHandler implements ResourceDataTypeHandler<BookmarkResourceContent> {
	readonly dataType = BOOKMARK_DATA_TYPE;
	readonly dataVersion = BOOKMARK_DATA_VERSION;

	validate(value: unknown): BookmarkResourceContent {
		const content = recordWithKeys(value, ['target', 'updatedAt', 'previewText']);
		return {
			target: parseBookmarkTarget(content.target),
			...parseBookmarkDisplayMetadata({
				updatedAt: content.updatedAt as number,
				previewText: content.previewText as string
			})
		};
	}
}

function recordWithKeys(value: unknown, expected: readonly string[]): Record<string, unknown> {
	if (
		value === null || typeof value !== 'object' || Array.isArray(value) ||
		Object.keys(value).length !== expected.length ||
		expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
	) {
		throw new Error('Invalid individual Bookmark Resource payload');
	}
	return value as Record<string, unknown>;
}
