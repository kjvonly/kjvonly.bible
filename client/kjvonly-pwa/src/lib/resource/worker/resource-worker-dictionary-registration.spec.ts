import { describe, expect, it } from 'vitest';

import type { DecodedResourceContent } from '$lib/resource/models/resource.model';
import {
	createDictionaryResourceId,
	DICTIONARY_DATA_VERSION,
	DICTIONARY_ENTRIES_DATA_TYPE,
	DICTIONARY_RESOURCE_TYPE
} from '$lib/domains/dictionary';

import { createContentResourceProcessor } from './resource-worker-composition';

const decoded: DecodedResourceContent = {
	publisher: 'dictionary-publisher',
	resourceId: createDictionaryResourceId('webster-1828'),
	resourceType: DICTIONARY_RESOURCE_TYPE,
	dataType: DICTIONARY_ENTRIES_DATA_TYPE,
	dataVersion: DICTIONARY_DATA_VERSION,
	modifiedAt: 100,
	mediaType: 'application/json',
	value: {
		aam: [{ word: 'AAM', content: '<p>A liquid measure.</p>' }]
	}
};

/** Verify the production worker resolves the Dictionary validator and factory. */
describe('Dictionary Resource worker registration', () => {
	it('routes invalid keyed bundles to the Dictionary datatype handler', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			value: { aam: [{ word: 'AAM', content: '' }] }
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected validation failure');
		expect((result.error as Error).message).toContain('Invalid Dictionary definition');
	});

	it('rejects unsupported Dictionary semantic data versions', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			dataVersion: DICTIONARY_DATA_VERSION + 1
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected version failure');
		expect((result.error as Error).message).toContain('Unsupported Resource data type');
	});

	it('routes validated bundles to the Dictionary Domain-object factory', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			resourceId: 'invalid-resource-id'
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected Resource identity failure');
		expect((result.error as Error).message).toContain('Invalid Dictionary Resource ID');
	});
});
