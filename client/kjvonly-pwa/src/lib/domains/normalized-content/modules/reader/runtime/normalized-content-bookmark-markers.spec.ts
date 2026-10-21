import { describe, expect, it } from 'vitest';
import type { Bookmark, NormalizedDocumentBookmarkTarget } from '$lib/domains/bookmarks';

import { createNormalizedContentBookmarkMarkers } from './normalized-content-bookmark-markers';

const identity = { publisher: 'publisher', resourceId: 'documents/a/%20/b' };

function bookmark(id: string, target: NormalizedDocumentBookmarkTarget): Bookmark {
	return { id, target, updatedAt: 1, previewText: 'Before Linked' };
}

function target(blockId: string, contentIndex: number): NormalizedDocumentBookmarkTarget {
	return {
		kind: 'normalized-document', document: identity,
		address: { kind: 'word', blockId, contentIndex }
	};
}

describe('Normalized Content Bookmark inline projection', () => {
	it('projects one marker for duplicate Bookmarks at a canonical word after an anchor', () => {
		const markers = createNormalizedContentBookmarkMarkers([
			bookmark('one', target('__proto__', 2)),
			bookmark('two', target('__proto__', 2))
		]);
		expect(markers.get('__proto__')).toEqual(new Set([2]));
		expect(markers.size).toBe(1);
	});

	it('projects distinct canonical word positions without inspecting document content', () => {
		const markers = createNormalizedContentBookmarkMarkers([
			bookmark('first', target('paragraph', 0)),
			bookmark('second', target('paragraph', 3)),
			bookmark('third', target('another-paragraph', 2))
		]);
		expect(markers.get('paragraph')).toEqual(new Set([0, 3]));
		expect(markers.get('another-paragraph')).toEqual(new Set([2]));
	});

	it('keeps saved canonical addresses without loading or cloning any document', () => {
		const markers = createNormalizedContentBookmarkMarkers([
			bookmark('stale', target('missing-block', 999)),
			bookmark('anchor-index', target('__proto__', 1))
		]);
		expect(markers.get('missing-block')).toEqual(new Set([999]));
		expect(markers.get('__proto__')).toEqual(new Set([1]));
		// The renderer only attaches markers to actual word elements.
	});
});
