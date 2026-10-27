import { describe, expect, it } from 'vitest';

import { BOOKMARK_OBJECT_TYPE, createBookmarkId } from '../models/bookmark-id';
import { BookmarkDataTypeHandler } from './bookmark-data-type-handler';
import { BookmarkDomainObjectFactory } from './bookmark-domain-object-factory';
import {
	BOOKMARKS_RESOURCE_TYPE,
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION
} from './bookmarks-resource-contract';
import { createBookmarkResourceId } from './bookmarks-resource-id';

const UUID = 'b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411';
const target = { kind: 'bible', bibleLocationRef: '43_3_16_0' } as const;
const metadata = { updatedAt: 1791840000000, previewText: 'For God so loved the world.' };
const resourceId = createBookmarkResourceId(UUID);

function context(overrides: Record<string, unknown> = {}) {
	return {
		publisher: 'bookmark-owner',
		resourceId,
		resourceType: BOOKMARKS_RESOURCE_TYPE,
		dataType: BOOKMARK_DATA_TYPE,
		dataVersion: BOOKMARK_DATA_VERSION,
		modifiedAt: 100,
		mediaType: 'application/json',
		...overrides
	};
}

describe('BookmarkDomainObjectFactory', () => {
	const factory = new BookmarkDomainObjectFactory();

	it('maps one validated payload to an independently identified Bookmark', () => {
		const content = new BookmarkDataTypeHandler().validate({ target, ...metadata });
		expect(factory.resourceType).toBe(BOOKMARKS_RESOURCE_TYPE);
		expect(factory.create(context(), content)).toEqual([{
			objectType: BOOKMARK_OBJECT_TYPE,
			objectId: createBookmarkId('bookmark-owner', UUID),
			dataType: BOOKMARK_DATA_TYPE,
			dataVersion: BOOKMARK_DATA_VERSION,
			value: {
				id: createBookmarkId('bookmark-owner', UUID),
				target,
				...metadata
			}
		}]);
	});

	it('derives Bookmark owner from the Resource, not the target document', () => {
		const normalized = {
			kind: 'normalized-document',
			document: { publisher: 'document-owner', resourceId: 'documents/one' },
			address: { kind: 'word', blockId: 'p1', contentIndex: 0 }
		};
		const [result] = factory.create(
			context(), new BookmarkDataTypeHandler().validate({ target: normalized, ...metadata })
		);
		expect(result.objectId).toBe(createBookmarkId('bookmark-owner', UUID));
		expect(result.value).toEqual({
			id: createBookmarkId('bookmark-owner', UUID),
			target: normalized,
			...metadata
		});
	});

	it.each([
		{ resourceId: 'kjvonly/bookmarks/bookmark/default/not-a-uuid' },
		{ resourceId: 'kjvonly/bookmarks/bookmark/default' },
		{ publisher: 'invalid/owner' },
		{ resourceType: 'notes/note' },
		{ dataType: 'kjvonly.note' },
		{ dataVersion: 2 },
		{ dataVersion: 3 }
	])('rejects incompatible Bookmark Resource identity/contract %#', (overrides) => {
		expect(() => factory.create(context(overrides), { target })).toThrow();
	});
});
