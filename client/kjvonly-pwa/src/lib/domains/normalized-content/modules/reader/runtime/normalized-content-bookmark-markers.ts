import type { Bookmark } from '$lib/domains/bookmarks';

import type { NormalizedContentWordMarkers } from '../../../ui/models/normalized-content-word-marker-handler';

/**
 * Projects the document-scoped Bookmarks returned by
 * BookmarksService.listForNormalizedDocument() into canonical word markers.
 * The Bookmarks Domain owns document matching; this function only projects
 * addresses. Duplicate Bookmarks at one word share a marker, and the renderer
 * ignores addresses without a corresponding mounted word.
 */
export function createNormalizedContentBookmarkMarkers(
	bookmarks: readonly Bookmark[]
): NormalizedContentWordMarkers {
	const markers = new Map<string, Set<number>>();
	for (const bookmark of bookmarks) {
		const target = bookmark.target;
		if (target.kind !== 'normalized-document') {
			continue;
		}
		let positions = markers.get(target.address.blockId);
		if (!positions) {
			positions = new Set<number>();
			markers.set(target.address.blockId, positions);
		}
		positions.add(target.address.contentIndex);
	}
	return markers;
}
