import { describe, expect, it } from 'vitest';
import { BookmarkDataTypeHandler } from './bookmark-data-type-handler';
import {
	BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION
} from './bookmarks-resource-contract';

const bibleTarget = { kind: 'bible', bibleLocationRef: '43_3_16_0' };
const normalizedTarget = {
	kind: 'normalized-document',
	document: { publisher: 'document-publisher', resourceId: 'commentary/genesis/1' },
	address: { kind: 'word', blockId: 'paragraph-1', contentIndex: 3 }
};
const metadata = { updatedAt: 1791840000000, previewText: 'For God so loved the world.' };

describe('BookmarkDataTypeHandler', () => {
	const handler = new BookmarkDataTypeHandler();

	it('registers the single v1 Bookmark Resource contract', () => {
		expect(handler.dataType).toBe(BOOKMARK_DATA_TYPE);
		expect(handler.dataVersion).toBe(BOOKMARK_DATA_VERSION);
	});

	it.each([bibleTarget, normalizedTarget])('accepts v1 with canonical target and metadata (%#)', (target) => {
		expect(handler.validate({ target, ...metadata })).toEqual({ target, ...metadata });
	});

	it.each([
		undefined, null, [], {},
		{ target: bibleTarget },
		{ id: 'ignored', target: bibleTarget, ...metadata },
		{ target: bibleTarget, ...metadata, additional: true },
		{ target: { ...bibleTarget, version: 'kjv' }, ...metadata },
		{ target: normalizedTarget, ...metadata, updatedAt: 0 },
		{ target: normalizedTarget, ...metadata, updatedAt: -1 },
		{ target: normalizedTarget, ...metadata, updatedAt: 1.5 },
		{ target: normalizedTarget, ...metadata, updatedAt: Number.MAX_SAFE_INTEGER + 1 },
		{ target: normalizedTarget, ...metadata, previewText: 'foo\nbar' },
		{ target: normalizedTarget, ...metadata, previewText: '<b>html</b>' },
		{ target: normalizedTarget, ...metadata, previewText: ' text ' },
		{ target: normalizedTarget, ...metadata, previewText: 'a'.repeat(4097) },
		{ target: { ...normalizedTarget, address: { ...normalizedTarget.address, contentIndex: -1 } }, ...metadata },
		{ target: { ...normalizedTarget, document: { ...normalizedTarget.document, hash: 'digest' } }, ...metadata }
	])('rejects invalid metadata, target or bundled v1 Resource %#', (value) => {
		expect(() => handler.validate(value)).toThrow();
	});

	it('accepts an empty preview from producers without a Reader snapshot', () => {
		expect(handler.validate({ target: bibleTarget, updatedAt: 1, previewText: '' }).previewText).toBe('');
	});
});
