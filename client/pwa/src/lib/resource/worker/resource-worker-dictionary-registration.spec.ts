import { describe, expect, it } from 'vitest';

import type { DecodedResourceContent } from '$lib/resource/models/resource.model';
import {
	createDictionaryResourceId,
	DICTIONARY_DATA_VERSION,
	DICTIONARY_ENTRIES_DATA_TYPE,
	DICTIONARY_RESOURCE_TYPE
} from '$lib/domains/dictionary';

import { createContentResourceProcessor } from './resource-worker-composition';

const edition = {
	definitionFormat: 'webster-html',
	headwords: [{ headword: 'aam', key: 'aam' }],
	definitions: { aam: [{ word: 'AAM', content: '<p>A liquid measure.</p>' }] }
};

const decoded: DecodedResourceContent = {
	publisher: 'dictionary-publisher',
	resourceId: createDictionaryResourceId('webster-1828'),
	resourceType: DICTIONARY_RESOURCE_TYPE,
	dataType: DICTIONARY_ENTRIES_DATA_TYPE,
	dataVersion: DICTIONARY_DATA_VERSION,
	modifiedAt: 100,
	mediaType: 'application/json',
	value: edition
};

/** Verify the production worker resolves the Dictionary validator and factory. */
describe('Dictionary Resource worker registration', () => {
	it('routes invalid Dictionary edition definitions to the datatype handler', async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			value: { ...edition, definitions: { aam: [{ word: 'AAM', content: '' }] } }
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') throw new Error('Expected validation failure');
		expect((result.error as Error).message).toContain('Invalid Dictionary definition');
	});

	it("routes Strong's dictionary definitions through the Strong's semantic validator", async () => {
		const result = await createContentResourceProcessor().processDecoded({
			...decoded,
			resourceId: createDictionaryResourceId('strongs-kjvs'),
			value: {
				definitionFormat: 'strongs',
				headwords: [{ headword: 'alpha', key: 'G1' }],
				definitions: { G1: { number: 'G1' } }
			}
		});
		expect(result.status).toBe('failed');
		if (result.status !== 'failed') { throw new Error("Expected Strong's validation failure"); }
		// The error comes from the existing Strong's schema, not Dictionary's envelope validator.
		expect((result.error as Error).message).toContain('originalWord');
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
