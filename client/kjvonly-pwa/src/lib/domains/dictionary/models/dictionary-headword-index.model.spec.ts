import { describe, expect, it } from 'vitest';
import { createDictionaryChunkGenerationId } from './dictionary-chunk-identity';
import type { DictionaryEditionSource } from './dictionary.model';
import {
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	createDictionaryHeadwordIndexId,
	encodeHeadwordForSearch,
	isCurrentDictionaryHeadwordIndex,
	type DictionaryHeadwordIndex
} from './dictionary-headword-index.model';

const source: DictionaryEditionSource = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };
const index: DictionaryHeadwordIndex = {
	id: createDictionaryHeadwordIndexId(source),
	...source,
	sourceRevision: 42,
	formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	headwordCount: 2,
	chunks: { reg: '{}', cfg: '{}', map: '{}' }
};

describe('Dictionary headword index identity and cache validity', () => {
	it('uses forward tokenization for leading prefixes', () => {
		expect(DICTIONARY_HEADWORD_INDEX_TOKENIZER).toBe('forward');
	});
	it('encodes whole headwords with stable, prefix-preserving code points', () => {
		expect(encodeHeadwordForSearch('a')).toBe('002p');
		expect(encodeHeadwordForSearch('a b')).toBe('002p000w002q');
		expect(encodeHeadwordForSearch('a b').startsWith(encodeHeadwordForSearch('a '))).toBe(true);
		expect(encodeHeadwordForSearch('ab').startsWith(encodeHeadwordForSearch('a '))).toBe(false);
		expect(encodeHeadwordForSearch('é')).toBe('006h');
	});
	it('distinguishes publishers and Resource IDs even when edition labels match', () => {
		expect(createDictionaryHeadwordIndexId(source)).not.toBe(createDictionaryHeadwordIndexId({
			...source, publisher: 'another'
		}));
		expect(createDictionaryHeadwordIndexId(source)).not.toBe(createDictionaryHeadwordIndexId({
			...source, resourceId: 'kjvonly/dictionary/entries/webster-1844'
		}));
	});

	it('uses the same edition identity for index and chunk generation keys', () => {
		const otherPublisher: DictionaryEditionSource = { ...source, publisher: 'another' };
		const otherResource: DictionaryEditionSource = {
			...source, resourceId: 'kjvonly/dictionary/entries/webster-1844'
		};
		expect(createDictionaryHeadwordIndexId(source)).not.toBe(createDictionaryHeadwordIndexId(otherPublisher));
		expect(createDictionaryChunkGenerationId(source, 'm42')).not.toBe(
			createDictionaryChunkGenerationId(otherPublisher, 'm42')
		);
		expect(createDictionaryChunkGenerationId(source, 'm42')).not.toBe(
			createDictionaryChunkGenerationId(otherResource, 'm42')
		);
	});

	it('accepts only current cache source, revision, and index format', () => {
		expect(isCurrentDictionaryHeadwordIndex(index, source, 42)).toBe(true);
		expect(isCurrentDictionaryHeadwordIndex(index, source, 43)).toBe(false);
		expect(isCurrentDictionaryHeadwordIndex(index, { ...source, publisher: 'other' }, 42)).toBe(false);
		expect(isCurrentDictionaryHeadwordIndex({ ...index, formatVersion: 0 }, source, 42)).toBe(false);
		expect(isCurrentDictionaryHeadwordIndex({ ...index, chunks: { map: 5 } }, source, 42)).toBe(false);
		expect(isCurrentDictionaryHeadwordIndex({ ...index, headwordCount: 0 }, source, 42)).toBe(false);
		expect(isCurrentDictionaryHeadwordIndex({ ...index, id: 'incorrect' }, source, 42)).toBe(false);
	});
});
