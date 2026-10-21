import { compareDictionaryHeadwordKeys, normalizeDictionaryHeadword } from '../models/dictionary-identity';
import { validateDictionaryChunkMap, type DictionaryChunkMap, type DictionaryChunkRange } from '../models/dictionary-chunk.model';

/**
 * Binary-search one canonical headword in an already validated range map.
 * Returns undefined for absent words without reading any definition content.
 */
export function findDictionaryChunkRange(
	map: DictionaryChunkMap,
	headwordKey: string
): DictionaryChunkRange | undefined {
	if (!headwordKey || headwordKey !== normalizeDictionaryHeadword(headwordKey)) {
		throw new Error(`Invalid canonical Dictionary headword key: ${headwordKey}`);
	}
	let lower = 0;
	let upper = map.ranges.length - 1;
	while (lower <= upper) {
		const middle = Math.floor((lower + upper) / 2);
		const range = map.ranges[middle]!;
		if (compareDictionaryHeadwordKeys(headwordKey, range.firstKey) < 0) {
			upper = middle - 1;
		} else if (compareDictionaryHeadwordKeys(headwordKey, range.lastKey) > 0) {
			lower = middle + 1;
		} else {
			return range;
		}
	}
	return undefined;
}

/**
 * Verify every headword claimed by a search index has an installed chunk range.
 * Run this at index/manifest acceptance, not on every interactive search.
 */
export function assertDictionaryChunkMapCoversHeadwords(
	map: DictionaryChunkMap,
	headwords: Iterable<string>
): void {
	validateDictionaryChunkMap(map);
	for (const key of headwords) {
		if (findDictionaryChunkRange(map, key) === undefined) {
			throw new Error(`Dictionary chunk-map does not cover headword: ${key}`);
		}
	}
}
