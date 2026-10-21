import { describe, expect, it } from 'vitest';
import type { DictionaryEntriesBundle } from '../models/dictionary.model';
import { partitionDictionaryIntoChunks } from './dictionary-chunk-partitioner';

function makeBundle(words: readonly string[]): DictionaryEntriesBundle {
	return Object.fromEntries(words.map(word => [word, [{ word, content: `<p>${word}</p>` }]]));
}

describe('Dictionary chunk partitioner', () => {
	it('balances on serialized bytes rather than first letters and preserves all definitions', () => {
		const bundle = makeBundle(['az', 'aa', 'ab', 'ac', 'ad', 'ae']);
		const firstEntryBytes = new TextEncoder().encode(JSON.stringify({ aa: bundle.aa })).byteLength;
		const chunks = [...partitionDictionaryIntoChunks(bundle, firstEntryBytes * 2)];
		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.map(chunk => chunk.chunkId)).toEqual(
			chunks.map((_, i) => String(i).padStart(4, '0'))
		);
		const merged = Object.assign({}, ...chunks.map(chunk => JSON.parse(chunk.serializedJson)));
		expect(merged).toEqual(bundle);
		for (const chunk of chunks) {
			expect(new TextEncoder().encode(chunk.serializedJson).byteLength).toBe(
				chunk.uncompressedBytes
			);
			expect(chunk.uncompressedBytes).toBeLessThanOrEqual(firstEntryBytes * 2);
		}
	});

	it('keeps all definitions for a word together, including an oversized group', () => {
		const bundle: DictionaryEntriesBundle = {
			b: [
				{ word: 'B', content: `<p>${'x'.repeat(300)}</p>` },
				{ word: 'B', content: '<p>Second meaning</p>' }
			],
			a: [{ word: 'A', content: '<p>A</p>' }],
			c: [{ word: 'C', content: '<p>C</p>' }]
		};
		const chunks = [...partitionDictionaryIntoChunks(bundle, 100)];
		const bChunk = chunks.find(chunk => chunk.firstKey === 'b');
		expect(bChunk?.lastKey).toBe('b');
		expect(bChunk?.uncompressedBytes).toBeGreaterThan(100);
		expect(JSON.parse(bChunk!.serializedJson).b).toEqual(bundle.b);
		expect(chunks.map(chunk => chunk.firstKey)).toEqual(['a', 'b', 'c']);
	});

	it('measures Unicode, escaped HTML and unusual JSON keys exactly', () => {
		const bundle: DictionaryEntriesBundle = Object.fromEntries([
			['10', [{ word: '10', content: '<p>"quotation"</p>' }]],
			['2', [{ word: '2', content: '<p>¥é𐐷</p>' }]],
			['__proto__', [{ word: '__proto__', content: '<p>Safe key</p>' }]],
			['a/b', [{ word: 'a/b', content: '<p>A/B</p>' }]]
		]);
		const chunks = [...partitionDictionaryIntoChunks(bundle, 1000)];
		expect(chunks).toHaveLength(1);
		expect(chunks[0]!.firstKey).toBe('10');
		expect(chunks[0]!.lastKey).toBe('a/b');
		expect(new TextEncoder().encode(chunks[0]!.serializedJson).byteLength).toBe(
			chunks[0]!.uncompressedBytes
		);
		expect(Object.hasOwn(JSON.parse(chunks[0]!.serializedJson), '__proto__')).toBe(true);
	});

	it('is deterministic regardless of source object insertion order', () => {
		const ascending = makeBundle(['a', 'ab', 'b', 'c', 'é']);
		const descending = makeBundle(['é', 'c', 'b', 'ab', 'a']);
		expect([...partitionDictionaryIntoChunks(ascending, 65)]).toEqual([
			...partitionDictionaryIntoChunks(descending, 65)
		]);
	});

	it('rejects noncanonical keys, empty dictionaries and invalid targets', () => {
		expect(() => [...partitionDictionaryIntoChunks({}, 100)]).toThrow('empty');
		expect(() => [...partitionDictionaryIntoChunks(makeBundle(['A']), 100)]).toThrow(
			'canonical'
		);
		expect(() => [...partitionDictionaryIntoChunks(makeBundle(['a']), 0)]).toThrow(
			'target'
		);
	});
});
