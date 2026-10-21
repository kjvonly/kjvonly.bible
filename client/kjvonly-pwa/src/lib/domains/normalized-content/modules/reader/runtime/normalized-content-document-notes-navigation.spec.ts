import { describe, expect, it } from 'vitest';

import type { ResourceDescriptor } from '$lib/resource';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../../resources/normalized-content-resource-contract';

import {
	createNormalizedContentDocumentNotesIntent
} from './normalized-content-document-notes-navigation';

function descriptor(
	resourceId: string,
	modifiedAt: number,
	publisher = 'document-publisher'
): ResourceDescriptor {
	return {
		metadata: {
			publisher,
			resourceId,
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

describe('Normalized Content Reader Document Notes intent', () => {
	it('preserves opaque Resource identity and uses display title only as metadata', () => {
		const source = descriptor('kjvonly/commentary/Gen%201/a/b', 123);
		expect(createNormalizedContentDocumentNotesIntent(source, 'Genesis 1')).toEqual({
			normalizedDocument: {
				scope: {
					kind: 'document',
					document: {
						publisher: 'document-publisher',
						resourceId: 'kjvonly/commentary/Gen%201/a/b'
					}
				},
				title: 'Genesis 1'
			}
		});
	});

	it('keeps document-level identity stable across Resource revisions', () => {
		const first = createNormalizedContentDocumentNotesIntent(
			descriptor('doc-id', 100), 'File A'
		);
		const revised = createNormalizedContentDocumentNotesIntent(
			descriptor('doc-id', 200), 'Renamed file'
		);
		expect(revised.normalizedDocument.scope).toEqual(first.normalizedDocument.scope);
		expect(revised.normalizedDocument.title).not.toEqual(first.normalizedDocument.title);
	});

	it('uses the active descriptor rather than similar filenames for identity', () => {
		const first = createNormalizedContentDocumentNotesIntent(
			descriptor('id-1', 10, 'publisher-1'), 'Same name'
		);
		const second = createNormalizedContentDocumentNotesIntent(
			descriptor('id-2', 10, 'publisher-1'), 'Same name'
		);
		const third = createNormalizedContentDocumentNotesIntent(
			descriptor('id-1', 10, 'publisher-2'), 'Same name'
		);
		expect(first.normalizedDocument.scope).not.toEqual(second.normalizedDocument.scope);
		expect(first.normalizedDocument.scope).not.toEqual(third.normalizedDocument.scope);
	});

	it('rejects missing identities and a mismatched semantic data contract', () => {
		expect(() => createNormalizedContentDocumentNotesIntent(
			descriptor('', 4), 'Document'
		)).toThrow();
		expect(() => createNormalizedContentDocumentNotesIntent(
			descriptor('doc', 4, ''), 'Document'
		)).toThrow();
		expect(() => createNormalizedContentDocumentNotesIntent({
			...descriptor('doc', 4),
			metadata: {
				...descriptor('doc', 4).metadata,
				dataType: 'kjvonly.other'
			}
		}, 'Document')).toThrow('Unsupported normalized document data type');
	});
});
