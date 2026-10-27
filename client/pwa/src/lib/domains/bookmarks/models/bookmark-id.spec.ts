import { describe, expect, it } from 'vitest';

import {
	BOOKMARK_OBJECT_TYPE,
	createBookmarkDomainObjectId,
	createBookmarkId,
	parseBookmarkId
} from './bookmark-id';

const UUID = 'b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411';

describe('Bookmark Domain identity', () => {
	it('preserves a location-independent, replaceable ID', () => {
		const id = createBookmarkId('publisher-a', UUID);
		expect(id).toBe(`publisher-a/default/${UUID}`);
		expect(parseBookmarkId(id)).toEqual({
			publisher: 'publisher-a', name: 'default', bookmarkId: UUID
		});
		expect(createBookmarkDomainObjectId(id))
			.toBe(`${BOOKMARK_OBJECT_TYPE}:${id}`);
	});

	it.each([
		'publisher-a/default',
		'publisher-a/default/not-a-uuid',
		'publisher-a/named/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411',
		'publisher-a/default/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411/extra',
		'publisher-a/default/B2E0DDFA-8c37-4c2b-9a15-99eeb4dcb411',
		'/default/b2e0ddfa-8c37-4c2b-9a15-99eeb4dcb411'
	])('rejects malformed identity %s', (id: string) => {
		expect(() => parseBookmarkId(id)).toThrow();
	});

	it('does not accept slash-containing owners or non-v4 UUIDs', () => {
		expect(() => createBookmarkId('a/b', UUID)).toThrow();
		expect(() => createBookmarkId('a', UUID.replace('-4', '-1'))).toThrow();
	});
});
