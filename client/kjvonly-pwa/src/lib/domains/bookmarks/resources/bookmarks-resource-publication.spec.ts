import { describe, expect, it } from 'vitest';

import type { Bookmark } from '../models/bookmark.model';
import { createBookmarkId } from '../models/bookmark-id';
import { BookmarkDataTypeHandler } from './bookmark-data-type-handler';
import { BookmarkDomainObjectFactory } from './bookmark-domain-object-factory';
import { BookmarksResourcePublication } from './bookmarks-resource-publication';
import {
	BOOKMARKS_RESOURCE_TYPE,
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION
} from './bookmarks-resource-contract';
import { createBookmarkResourceId } from './bookmarks-resource-id';

const UUID = 'b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411';
const OWNER = 'bookmark-owner';
const RESOURCE_ID = createBookmarkResourceId(UUID);
const bookmark: Bookmark = {
	id: createBookmarkId(OWNER, UUID),
	target: { kind: 'bible', bibleLocationRef: '43_3_16_0' },
	updatedAt: 1791840000000,
	previewText: 'For God so loved the world.'
};

describe('BookmarksResourcePublication', () => {
	const publisher = new BookmarksResourcePublication();

	it('publishes target and display metadata with stable replacement identity', () => {
		const publication = publisher.create(bookmark);
		expect(publication).toEqual({
			type: 'resource',
			publisher: OWNER,
			resourceType: BOOKMARKS_RESOURCE_TYPE,
			resourceId: RESOURCE_ID,
			dataType: BOOKMARK_DATA_TYPE,
			dataVersion: BOOKMARK_DATA_VERSION,
			representation: 'content',
			mediaType: 'application/json+gzip+hex',
			value: { target: bookmark.target, updatedAt: bookmark.updatedAt, previewText: bookmark.previewText }
		});
		expect(publication.value).not.toHaveProperty('id');
	});

	it('relocating does not change Resource identity or delete duplicates', () => {
		const relocated = publisher.create({
			...bookmark,
			target: { kind: 'bible', bibleLocationRef: '43_3_17_8' },
			updatedAt: bookmark.updatedAt + 1, previewText: 'Another verse.'
		});
		expect(relocated.resourceId).toBe(publisher.create(bookmark).resourceId);
		expect(relocated.publisher).toBe(OWNER);
		expect(relocated.value).toEqual({
			target: { kind: 'bible', bibleLocationRef: '43_3_17_8' },
			updatedAt: bookmark.updatedAt + 1, previewText: 'Another verse.'
		});
	});

	it('round trips a normalized target through Resource validation and factory', () => {
		const normalized: Bookmark = {
			...bookmark,
			target: {
				kind: 'normalized-document',
				document: { publisher: 'different-author', resourceId: 'commentary/genesis/1' },
				address: { kind: 'word', blockId: 'p1', contentIndex: 0 }
			}
		};
		const published = publisher.create(normalized);
		const validated = new BookmarkDataTypeHandler().validate(published.value);
		const [candidate] = new BookmarkDomainObjectFactory().create({
			publisher: published.publisher,
			resourceId: published.resourceId,
			resourceType: published.resourceType,
			dataType: published.dataType,
			dataVersion: published.dataVersion,
			modifiedAt: 100,
			mediaType: published.mediaType
		}, validated);
		expect(candidate.value).toEqual(normalized);
	});

	it('deletes only by the Bookmark identity, without involving its location', () => {
		expect(publisher.createDeletion(bookmark.id)).toEqual({
			type: 'resource',
			operation: 'delete',
			publisher: OWNER,
			resourceType: BOOKMARKS_RESOURCE_TYPE,
			resourceId: RESOURCE_ID
		});
	});

	it('refuses malformed targets and identities at publication', () => {
		expect(() => publisher.create({
			...bookmark, id: 'not-an-id'
		})).toThrow();
		expect(() => publisher.create({
			...bookmark,
			target: { kind: 'bible', bibleLocationRef: '43_3_16' }
		})).toThrow();
		expect(() => publisher.createDeletion('not-an-id')).toThrow();
	});
});
