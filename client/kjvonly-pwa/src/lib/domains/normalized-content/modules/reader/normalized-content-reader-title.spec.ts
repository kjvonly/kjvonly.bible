import { describe, expect, it } from 'vitest';

import type { ResourceDescriptor } from '$lib/resource';

import { resolveNormalizedContentReaderTitle } from './normalized-content-reader-title';

const descriptor = {
	metadata: {
		publisher: 'publisher',
		resourceId: 'opaque-resource-identity',
		name: 'Document Metadata Title',
		resourceType: 'normalized-content/document',
		dataType: 'kjvonly.normalized-document',
		dataVersion: 1,
		modifiedAt: 1,
		representation: 'content',
		mediaType: 'application/json'
	},
	strategy: { type: 'inline', data: null }
} satisfies ResourceDescriptor;

describe('Normalized Content Reader title', () => {
	it('uses the launched filename without the compound normalized-document extension', () => {
		expect(resolveNormalizedContentReaderTitle(descriptor, 'Genesis-1.nd.json'))
			.toBe('Genesis-1');
	});

	it('strips an ordinary file extension', () => {
		expect(resolveNormalizedContentReaderTitle(descriptor, 'Chapter.2.json'))
			.toBe('Chapter.2');
	});

	it('uses the explicit descriptor name when no filename is supplied', () => {
		expect(resolveNormalizedContentReaderTitle(descriptor))
			.toBe('Document Metadata Title');
	});

	it('uses the existing Document fallback for unnamed non-filesystem opens', () => {
		expect(resolveNormalizedContentReaderTitle({
			...descriptor,
			metadata: { ...descriptor.metadata, name: undefined }
		})).toBe('Document');
	});
});
