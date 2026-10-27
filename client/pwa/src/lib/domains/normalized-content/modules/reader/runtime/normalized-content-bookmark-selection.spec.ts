import { describe, expect, it } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { ResourceDescriptor } from '$lib/resource';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../../resources/normalized-content-resource-contract';
import { createNormalizedContentBookmarkSelection, createNormalizedContentBookmarkTarget } from './normalized-content-bookmark-selection';

const document: NormalizedDocument = {
	blocks: [
		{
			type: 'paragraph', id: '__proto__', content: [
				{ type: 'word', text: 'In' },
				{ type: 'anchor', id: 'bookmark' },
				{ type: 'word', text: 'the' },
				{ type: 'word', text: 'beginning' },
				{ type: 'word', text: ',', joinPrevious: true },
				{ type: 'word', text: 'God.' }
			]
		},
		{ type: 'quote', id: 'section', blocks: [
			{ type: 'paragraph', id: 'nested', content: [
				{ type: 'word', text: 'First' },
				{ type: 'line-break' },
				{ type: 'word', text: 'second' }
			] }
		] }
	]
};

function descriptor(modifiedAt = 100): ResourceDescriptor {
	return {
		metadata: {
			publisher: 'publisher',
			resourceId: 'documents/a/%20/b',
			resourceType: 'normalized-content/document',
			dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
			dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
			modifiedAt,
			representation: 'content',
			mediaType: 'application/json'
		},
		strategy: { type: 'test', data: null }
	};
}

describe('Normalized Content Bookmark target', () => {
	it('builds the exact canonical browse target without requiring preview text', () => {
		const address = { blockId: '__proto__', contentIndex: 3 };
		const target = createNormalizedContentBookmarkTarget(descriptor(100), document, address);
		expect(target).toEqual({
			kind: 'normalized-document',
			document: { publisher: 'publisher', resourceId: 'documents/a/%20/b' },
			address: { kind: 'word', ...address }
		});
		expect(createNormalizedContentBookmarkTarget(descriptor(200), document, address)).toEqual(target);
	});

	it('validates canonical words before opening a Bookmark marker', () => {
		expect(() => createNormalizedContentBookmarkTarget(
			descriptor(), document, { blockId: '__proto__', contentIndex: 1 }
		)).toThrow();
		expect(() => createNormalizedContentBookmarkTarget(
			descriptor(), document, { blockId: 'missing', contentIndex: 0 }
		)).toThrow();
	});
});

describe('Normalized Content Bookmark selection', () => {
	it('uses the opaque Resource identity and canonical indexes, never modifiedAt', () => {
		const address = { blockId: '__proto__', contentIndex: 3 };
		const selected = createNormalizedContentBookmarkSelection(descriptor(100), document, address);
		expect(selected.target).toEqual({
			kind: 'normalized-document',
			document: { publisher: 'publisher', resourceId: 'documents/a/%20/b' },
			address: { kind: 'word', ...address }
		});
		expect(selected.previewText).toBe('In the beginning, God.');
		expect(createNormalizedContentBookmarkSelection(descriptor(200), document, address))
			.toEqual(selected);
	});

	it('supports nested words and line breaks without using DOM text', () => {
		expect(createNormalizedContentBookmarkSelection(
			descriptor(), document, { blockId: 'nested', contentIndex: 2 }
		).previewText).toBe('First second');
	});

	it('rejects nonword entries, missing blocks, bad indexes, and descriptors', () => {
		for (const address of [
			{ blockId: '__proto__', contentIndex: 1 },
			{ blockId: '__proto__', contentIndex: 9 },
			{ blockId: 'missing', contentIndex: 0 },
			{ blockId: '__proto__', contentIndex: -1 }
		]) {
			expect(() => createNormalizedContentBookmarkSelection(descriptor(), document, address))
				.toThrow();
		}
		expect(() => createNormalizedContentBookmarkSelection({
			...descriptor(),
			metadata: { ...descriptor().metadata, resourceId: '' }
		}, document, { blockId: '__proto__', contentIndex: 0 })).toThrow();
		expect(() => createNormalizedContentBookmarkSelection({
			...descriptor(),
			metadata: { ...descriptor().metadata, publisher: '' }
		}, document, { blockId: '__proto__', contentIndex: 0 })).toThrow();
		expect(() => createNormalizedContentBookmarkSelection({
			...descriptor(),
			metadata: { ...descriptor().metadata, dataVersion: 999 }
		}, document, { blockId: '__proto__', contentIndex: 0 })).toThrow();
	});
});
