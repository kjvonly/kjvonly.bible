import type {
	ResourceDomainObjectCandidate,
	ResourceDomainObjectFactory,
	ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	BOOKMARK_OBJECT_TYPE,
	createBookmarkId
} from '../models/bookmark-id';

import type {
	Bookmark
} from '../models/bookmark.model';

import {
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION,
	BOOKMARKS_RESOURCE_TYPE,
	type BookmarkResourceContent
} from './bookmarks-resource-contract';

import {
	parseBookmarkResourceId
} from './bookmarks-resource-id';

/**
 * Produces exactly one Bookmark from a validated individual Bookmark Resource.
 * The generic installer handles currentness, transaction and persistence.
 */
export class BookmarkDomainObjectFactory
	implements ResourceDomainObjectFactory {
	readonly resourceType = BOOKMARKS_RESOURCE_TYPE;

	create(
		resource: ResourceDomainObjectFactoryContext,
		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		if (
			resource.resourceType !== BOOKMARKS_RESOURCE_TYPE ||
			resource.dataType !== BOOKMARK_DATA_TYPE ||
			resource.dataVersion !== BOOKMARK_DATA_VERSION
		) {
			throw new Error('Invalid Bookmark Resource contract');
		}

		const { bookmarkId } = parseBookmarkResourceId(resource.resourceId);
		const id = createBookmarkId(resource.publisher, bookmarkId);
		// The ResourceDataTypeHandler has already validated this payload.
		const content = value as BookmarkResourceContent;
		const bookmark: Bookmark = { id, ...content };

		return [{
			objectType: BOOKMARK_OBJECT_TYPE,
			objectId: id,
			dataType: BOOKMARK_DATA_TYPE,
			dataVersion: BOOKMARK_DATA_VERSION,
			value: bookmark
		}];
	}
}
