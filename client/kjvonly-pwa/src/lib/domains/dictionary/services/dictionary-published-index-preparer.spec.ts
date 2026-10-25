import { describe, expect, it, vi } from 'vitest';
import { DictionaryPublishedIndexPreparer } from './dictionary-published-index-preparer';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const reference = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/search-index/webster-1828' };

describe('Dictionary published index Resource preparation', () => {
	it('requires an accepted index Resource for the exact edition and publisher', async () => {
		const install = vi.fn().mockResolvedValue({ requested: reference, found: true,
			resources: [{ reference, resourceType: 'dictionary/search-index', status: 'handled' }] });
		await new DictionaryPublishedIndexPreparer({ install }).prepare(source);
		expect(install).toHaveBeenCalledExactlyOnceWith(reference);
	});
	it('rejects an unavailable published index instead of allowing fallback', async () => {
		const install = vi.fn().mockResolvedValue({ requested: reference, found: false, resources: [] });
		await expect(new DictionaryPublishedIndexPreparer({ install }).prepare(source))
			.rejects.toThrow('not accepted');
	});
	it('propagates installation failures and rejects unrelated accepted Resources', async () => {
		const failed = vi.fn().mockRejectedValue(new Error('offline'));
		await expect(new DictionaryPublishedIndexPreparer({ install: failed }).prepare(source)).rejects.toThrow('offline');
		const wrong = vi.fn().mockResolvedValue({ requested: reference, found: true, resources: [
			{ reference: { ...reference, resourceId: 'other' }, resourceType: 'dictionary/search-index', status: 'handled' }
		] });
		await expect(new DictionaryPublishedIndexPreparer({ install: wrong }).prepare(source))
			.rejects.toThrow('not accepted');
	});
});
