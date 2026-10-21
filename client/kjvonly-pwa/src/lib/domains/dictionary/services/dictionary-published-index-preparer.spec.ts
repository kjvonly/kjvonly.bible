import { describe, expect, it, vi } from 'vitest';
import { DictionaryPublishedIndexPreparer } from './dictionary-published-index-preparer';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

describe('Dictionary published index Resource preparation', () => {
	it('requests matching publisher and index Resource ID via the generic installer', async () => {
		const install = vi.fn().mockResolvedValue({ found: true, resources: [] });
		await new DictionaryPublishedIndexPreparer({ install }).prepare(source);
		expect(install).toHaveBeenCalledWith({
			publisher: 'publisher', resourceId: 'kjvonly/dictionary/search-index/webster-1828'
		});
	});
	it('reports a missing published index without failing preparation', async () => {
		const install = vi.fn().mockResolvedValue({ found: false, resources: [] });
		await expect(new DictionaryPublishedIndexPreparer({ install }).prepare(source)).resolves.toBeUndefined();
	});

	it('propagates Resource installation failures to the caller that owns fallback policy', async () => {
		const install = vi.fn().mockRejectedValue(new Error('offline'));
		await expect(new DictionaryPublishedIndexPreparer({ install }).prepare(source)).rejects.toThrow('offline');
	});
});
