import { describe, expect, it } from 'vitest';
import {
	createDictionaryChunkGeneration,
	createDictionaryChunkMapObjectId,
	createDictionaryChunkObjectId
} from '../models/dictionary-chunk-identity';
import { createDictionaryChunkMap, validateDictionaryChunkMap, type DictionaryChunkRange } from '../models/dictionary-chunk.model';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import { findDictionaryChunkRange } from './dictionary-chunk-locator';

const source: DictionaryEditionSource = {
	publisher: 'publisher-1',
	resourceId: 'kjvonly/dictionary/entries/webster-1828'
};
const generation = createDictionaryChunkGeneration(42);
const ranges: readonly DictionaryChunkRange[] = [
	{ chunkId: '0000', firstKey: 'a', lastKey: 'abandon' },
	{ chunkId: '0001', firstKey: 'abandonment', lastKey: 'absolute' },
	{ chunkId: '0002', firstKey: 'é', lastKey: 'éclair' }
];

describe('Dictionary chunk locator', () => {
	it('finds inclusive first/last keys and adjacent boundaries via binary search', () => {
		const map = createDictionaryChunkMap(source, generation, ranges);
		expect(findDictionaryChunkRange(map, 'a')?.chunkId).toBe('0000');
		expect(findDictionaryChunkRange(map, 'abandon')?.chunkId).toBe('0000');
		expect(findDictionaryChunkRange(map, 'abandonment')?.chunkId).toBe('0001');
		expect(findDictionaryChunkRange(map, 'absolute')?.chunkId).toBe('0001');
		expect(findDictionaryChunkRange(map, 'éclair')?.chunkId).toBe('0002');
		expect(findDictionaryChunkRange(map, 'b')).toBeUndefined();
		expect(findDictionaryChunkRange(map, 'zz')).toBeUndefined();
		expect(findDictionaryChunkRange(map, 'ABANDON')).toBeUndefined();
	});

	it('locates case-sensitive Strong’s definition keys without normalizing them', () => {
		const map = createDictionaryChunkMap(source, generation, [
			{ chunkId: '0000', firstKey: 'G25', lastKey: 'G26' },
			{ chunkId: '0001', firstKey: 'H157', lastKey: 'H7225' }
		]);
		expect(findDictionaryChunkRange(map, 'G26')?.chunkId).toBe('0000');
		expect(findDictionaryChunkRange(map, 'H7225')?.chunkId).toBe('0001');
		expect(findDictionaryChunkRange(map, 'g26')).toBeUndefined();
	});

	it('keeps chunk IDs independent across publishers, resources and revisions', () => {
		const otherPublisher = { ...source, publisher: 'publisher-2' };
		const otherEdition = {
			...source,
			resourceId: 'kjvonly/dictionary/entries/webster-1844'
		};
		expect(createDictionaryChunkObjectId(source, generation, 0)).not.toBe(
			createDictionaryChunkObjectId(otherPublisher, generation, 0)
		);
		expect(createDictionaryChunkMapObjectId(source, generation)).not.toBe(
			createDictionaryChunkMapObjectId(otherEdition, generation)
		);
		expect(createDictionaryChunkObjectId(source, generation, 0)).not.toBe(
			createDictionaryChunkObjectId(source, createDictionaryChunkGeneration(43), 0)
		);
		expect(() => createDictionaryChunkGeneration(-1)).toThrow('revision');
	});

	it('rejects overlapping, unordered and duplicated chunk ranges', () => {
		expect(() => createDictionaryChunkMap(source, generation, [
			{ chunkId: '0000', firstKey: 'a', lastKey: 'c' },
			{ chunkId: '0001', firstKey: 'c', lastKey: 'z' }
		])).toThrow('Overlapping');
		expect(() => createDictionaryChunkMap(source, generation, [
			{ chunkId: '0000', firstKey: 'b', lastKey: 'b' },
			{ chunkId: '0001', firstKey: 'a', lastKey: 'a' }
		])).toThrow('unordered');
		expect(() => createDictionaryChunkMap(source, generation, [
			{ chunkId: '0000', firstKey: 'a', lastKey: 'b' },
			{ chunkId: '0000', firstKey: 'c', lastKey: 'd' }
		])).toThrow('Duplicate');
		expect(() => createDictionaryChunkMap(source, generation, [
			{ chunkId: '0001', firstKey: 'a', lastKey: 'b' }
		])).toThrow('Nonsequential');
		expect(() => createDictionaryChunkMap(source, generation, [])).toThrow('at least one');
	});

	it('rejects mismatched chunk-map identity and ranges', () => {
		const map = createDictionaryChunkMap(source, generation, ranges);
		expect(() => validateDictionaryChunkMap(null)).toThrow('object');
		expect(() => validateDictionaryChunkMap({ ...map, ranges: [null] })).toThrow('position');
		expect(() => validateDictionaryChunkMap({ ...map, id: 'wrong' })).toThrow('identity');
	});
});
