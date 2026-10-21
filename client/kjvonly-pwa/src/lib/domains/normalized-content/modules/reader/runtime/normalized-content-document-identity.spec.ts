import { describe, expect, it } from 'vitest';

import type { ResourceDescriptor } from '$lib/resource';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../../resources/normalized-content-resource-contract';

import { requireNormalizedContentDocumentIdentity } from './normalized-content-document-identity';

function descriptor(
	publisher: string,
	resourceId: string,
	modifiedAt: number
): ResourceDescriptor {
	return {
		metadata: {
			publisher,
			resourceId,
			modifiedAt,
			resourceType: 'normalized-content/document',
			dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
			dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
			representation: 'content',
			mediaType: 'application/json'
		},
		strategy: { type: 'test', data: null }
	};
}

describe('Normalized Content document identity', () => {
	it('preserves opaque Resource IDs and excludes revision metadata', () => {
		const first = descriptor('publisher', 'documents/a%2Fb/section', 100);
		const updated = descriptor('publisher', 'documents/a%2Fb/section', 200);
		expect(requireNormalizedContentDocumentIdentity(first)).toEqual({
			publisher: 'publisher',
			resourceId: 'documents/a%2Fb/section'
		});
		expect(requireNormalizedContentDocumentIdentity(updated)).toEqual(
			requireNormalizedContentDocumentIdentity(first)
		);
	});

	it('rejects incomplete or unsupported document descriptors', () => {
		expect(() => requireNormalizedContentDocumentIdentity(descriptor('', 'doc', 100))).toThrow('Invalid normalized document identity');
		expect(() => requireNormalizedContentDocumentIdentity(descriptor('publisher', '', 100))).toThrow('Invalid normalized document identity');
		const valid = descriptor('publisher', 'doc', 100);
		expect(() => requireNormalizedContentDocumentIdentity({
			...valid,
			metadata: { ...valid.metadata, dataType: 'other.document' }
		})).toThrow('Unsupported normalized document data type');
	});
});
