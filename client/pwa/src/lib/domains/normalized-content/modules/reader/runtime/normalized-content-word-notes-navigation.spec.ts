import { describe, expect, it } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { ResourceDescriptor } from '$lib/resource';
import { parseNotesNavigationIntent } from '$lib/domains/notes';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../../resources/normalized-content-resource-contract';
import {
	createNormalizedContentWordNotesIntent,
	createNormalizedContentWordNotesBrowseIntent
} from './normalized-content-word-notes-navigation';

const document: NormalizedDocument = {
	blocks: [
		{
			type: 'paragraph',
			id: '__proto__',
			content: [
				{ type: 'word', text: 'In' },
				{ type: 'anchor', id: 'bookmark' },
				{ type: 'word', text: 'beginning', href: ['bibleLocationReference:1_1'] }
			]
		},
		{
			type: 'quote',
			id: 'section-1',
			blocks: [{
				type: 'paragraph', id: 'nested',
				content: [{ type: 'word', text: 'nested' }]
			}]
		}
	]
};

/** Active document descriptor; modifiedAt is intentionally irrelevant to Notes. */
function descriptor(modifiedAt: number): ResourceDescriptor {
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

describe('Normalized Content Reader word Notes navigation', () => {
	it('opens an existing canonical word Notes scope without creating a Note', () => {
		const address = { blockId: '__proto__', contentIndex: 2 };
		const intent = createNormalizedContentWordNotesBrowseIntent(
			descriptor(100), '', address
		);
		expect(intent).toEqual({
			normalizedDocument: {
				scope: {
					kind: 'word',
					document: { publisher: 'publisher', resourceId: 'documents/a/%20/b' },
					address
				},
				title: ''
			}
		});
		expect(parseNotesNavigationIntent(intent)).toEqual(intent);
		expect(createNormalizedContentWordNotesBrowseIntent(descriptor(200), '', address)).toEqual(intent);
	});

	it('selects canonical content[] indexes, including linked words after anchors', () => {
		const intent = createNormalizedContentWordNotesIntent(
			descriptor(100), 'Genesis 1', document,
			{ blockId: '__proto__', contentIndex: 2 }
		);
		expect(intent).toEqual({
			normalizedDocument: {
				scope: { kind: 'document', document: {
					publisher: 'publisher', resourceId: 'documents/a/%20/b'
				} },
				title: 'Genesis 1',
				createTarget: {
					kind: 'normalized-document',
					document: { publisher: 'publisher', resourceId: 'documents/a/%20/b' },
					target: { kind: 'word', address: {
						blockId: '__proto__', contentIndex: 2
					} }
				}
			}
		});
		expect(parseNotesNavigationIntent(intent)).toEqual(intent);
		expect(createNormalizedContentWordNotesIntent(
			descriptor(200), 'Genesis 1', document,
			{ blockId: '__proto__', contentIndex: 2 }
		)).toEqual(intent);
	});

	it('accepts canonical words within recursively nested blocks', () => {
		const intent = createNormalizedContentWordNotesIntent(
			descriptor(10), 'Nested', document,
			{ blockId: 'nested', contentIndex: 0 }
		);
		expect(intent.normalizedDocument.createTarget?.target).toEqual({
			kind: 'word', address: { blockId: 'nested', contentIndex: 0 }
		});
	});

	it('rejects anchors, missing blocks, nonexistent indexes and invalid descriptors', () => {
		for (const address of [
			{ blockId: '__proto__', contentIndex: 1 },
			{ blockId: '__proto__', contentIndex: 3 },
			{ blockId: 'missing', contentIndex: 0 },
			{ blockId: '__proto__', contentIndex: -1 }
		]) {
			expect(() => createNormalizedContentWordNotesIntent(
				descriptor(10), 'Genesis 1', document, address
			)).toThrow('canonical word');
		}
		expect(() => createNormalizedContentWordNotesIntent(
			{
				...descriptor(10),
				metadata: { ...descriptor(10).metadata, resourceId: '' }
			},
			'Genesis 1', document, { blockId: '__proto__', contentIndex: 0 }
		)).toThrow('Invalid normalized document identity');
	});
});
