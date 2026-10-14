import { describe, expect, it } from 'vitest';

import type { DecodedResourceContent } from '$lib/resource/models/resource.model';

import {
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION,
	BOOKMARKS_RESOURCE_TYPE
} from '$lib/domains/bookmarks';

import { createContentResourceProcessor } from './resource-worker-composition';

const decoded: DecodedResourceContent = {
	publisher: 'bookmark-owner',
	resourceId: 'invalid-bookmark-resource-id',
	resourceType: BOOKMARKS_RESOURCE_TYPE,
	dataType: BOOKMARK_DATA_TYPE,
	dataVersion: BOOKMARK_DATA_VERSION,
	modifiedAt: 100,
	mediaType: 'application/json',
	value: { target: { kind: 'bible', bibleLocationRef: '43_3_16_0' }, updatedAt: 1791840000000, previewText: '' }
};

describe('Bookmark Resource worker registration', () => {
	it('dispatches invalid Bookmark payloads to the Bookmark data-type validator', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			value: { unsupported: true }
		});

		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected failure');
		expect(result.error).toBeInstanceOf(Error);
		expect((result.error as Error).message).toContain('Invalid individual Bookmark Resource payload');
	});

	it('rejects target-only payloads under the single v1 contract', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			value: { target: { kind: 'bible', bibleLocationRef: '43_3_16_0' } }
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected validation failure');
		expect((result.error as Error).message).toContain('Invalid individual Bookmark Resource payload');
	});

	it('dispatches accepted Bookmark payloads to the Bookmark identity factory', async () => {
		const result = await createContentResourceProcessor().processDecoded(decoded);

		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected failure');
		expect(result.error).toBeInstanceOf(Error);
		expect((result.error as Error).message).toContain('Invalid Bookmark Resource ID');
	});
});
