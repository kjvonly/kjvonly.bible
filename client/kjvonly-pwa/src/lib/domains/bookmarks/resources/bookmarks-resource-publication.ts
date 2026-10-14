import type {
	ResourceDeletionPublication,
	ResourcePublication
} from '$lib/resource';

import type {
	Bookmark
} from '../models/bookmark.model';

import {
	parseBookmarkId
} from '../models/bookmark-id';

import { parseBookmarkTarget } from '../services/bookmark-target-validation';
import { parseBookmarkDisplayMetadata } from '../services/bookmark-metadata';

import {
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION,
	BOOKMARKS_RESOURCE_TYPE
} from './bookmarks-resource-contract';

import {
	createBookmarkResourceId
} from './bookmarks-resource-id';

/** Creates replaceable individual Bookmark Resource publication intents. */
export class BookmarksResourcePublication {
	create(bookmark: Bookmark): ResourcePublication {
		return {
			type: 'resource',
			...this.identity(bookmark.id),
			dataType: BOOKMARK_DATA_TYPE,
			dataVersion: BOOKMARK_DATA_VERSION,
			representation: 'content',
			mediaType: 'application/json+gzip+hex',
			value: {
				target: parseBookmarkTarget(bookmark.target),
				...parseBookmarkDisplayMetadata(bookmark)
			}
		};
	}

	/** Delete one Bookmark by stable identity, not by its target location. */
	createDeletion(bookmarkId: string): ResourceDeletionPublication {
		return {
			type: 'resource',
			operation: 'delete',
			...this.identity(bookmarkId)
		};
	}

	private identity(bookmarkId: string): {
		readonly publisher: string;
		readonly resourceType: string;
		readonly resourceId: string;
	} {
		const { publisher, bookmarkId: uuid } = parseBookmarkId(bookmarkId);
		return {
			publisher,
			resourceType: BOOKMARKS_RESOURCE_TYPE,
			resourceId: createBookmarkResourceId(uuid)
		};
	}
}
