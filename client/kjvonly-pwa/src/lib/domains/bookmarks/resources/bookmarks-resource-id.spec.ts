import { describe, expect, it } from 'vitest';

import { createBookmarkId } from '../models/bookmark-id';
import { createBookmarkResourceId, parseBookmarkResourceId } from './bookmarks-resource-id';

const UUID = 'b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411';

describe('Bookmark Resource identity', () => {
	it('round trips one Bookmark per Resource and is independent of publisher and target', () => {
		const resourceId = createBookmarkResourceId(UUID);
		expect(resourceId).toBe(`kjvonly/bookmarks/bookmark/default/${UUID}`);
		expect(parseBookmarkResourceId(resourceId)).toEqual({
			name: 'default', bookmarkId: UUID
		});
		expect(createBookmarkId('owner-a', UUID)).not.toBe(createBookmarkId('owner-b', UUID));
	});

	it.each([
		'kjvonly/bookmarks/bookmark/default',
		'kjvonly/bookmarks/bookmark/default/invalid',
		'kjvonly/bookmarks/entries/default/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411',
		'kjvonly/bookmarks/bookmark/default/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411/more',
		'kjvonly/bookmarks/bookmark/named/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411'
	])('rejects invalid Resource ID %s', (resourceId: string) => {
		expect(() => parseBookmarkResourceId(resourceId)).toThrow();
	});
});
