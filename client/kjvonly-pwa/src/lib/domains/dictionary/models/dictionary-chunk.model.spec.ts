import { describe, expect, it } from 'vitest';
import { createDictionaryChunkGeneration, createDictionaryChunkMapObjectId } from './dictionary-chunk-identity';
import { createDictionaryChunkMap, validateDictionaryChunkMap } from './dictionary-chunk.model';

describe('Dictionary chunk-map model', () => {
	it('constructs an edition-scoped map without retaining mutable input references', () => {
		const source = {
			publisher: 'publisher-one',
			resourceId: 'kjvonly/dictionary/entries/webster-1828'
		};
		const ranges = [{ chunkId: '0000', firstKey: 'a', lastKey: 'z' }];
		const generation = createDictionaryChunkGeneration(42);
		const map = createDictionaryChunkMap(source, generation, ranges);

		expect(map.id).toBe(createDictionaryChunkMapObjectId(source, generation));
		source.publisher = 'other-publisher';
		ranges[0]!.firstKey = 'b';
		expect(map.source.publisher).toBe('publisher-one');
		expect(map.ranges[0]?.firstKey).toBe('a');
		expect(() => validateDictionaryChunkMap(map)).not.toThrow();
	});

	it('rejects malformed stored identity and ranges before they reach the locator', () => {
		const source = {
			publisher: 'publisher-one',
			resourceId: 'kjvonly/dictionary/entries/webster-1828'
		};
		const map = createDictionaryChunkMap(source, 'm42', [
			{ chunkId: '0000', firstKey: 'a', lastKey: 'z' }
		]);
		expect(() => validateDictionaryChunkMap({ ...map, source: { ...source, publisher: 'different' } })).toThrow('identity');
		expect(() => validateDictionaryChunkMap({ ...map, ranges: [{ chunkId: '0000', firstKey: 'z', lastKey: 'a' }] })).toThrow('range');
	});
});
