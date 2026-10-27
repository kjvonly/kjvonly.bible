import { compareDictionaryDefinitionKeys } from '../models/dictionary-identity';
import { validateDictionaryChunkMap, type DictionaryChunkMap, type DictionaryChunkRange } from '../models/dictionary-chunk.model';

/**
 * Binary-search one opaque definition key in an already validated range map.
 * Returns undefined for absent keys without reading any definition content.
 */
export function findDictionaryChunkRange(
	map: DictionaryChunkMap,
	definitionKey: string
): DictionaryChunkRange | undefined {
	if (!definitionKey) {
		throw new Error('Dictionary definition key cannot be empty.');
	}
	let lower = 0;
	let upper = map.ranges.length - 1;
	while (lower <= upper) {
		const middle = Math.floor((lower + upper) / 2);
		const range = map.ranges[middle]!;
		if (compareDictionaryDefinitionKeys(definitionKey, range.firstKey) < 0) {
			upper = middle - 1;
		} else if (compareDictionaryDefinitionKeys(definitionKey, range.lastKey) > 0) {
			lower = middle + 1;
		} else {
			return range;
		}
	}
	return undefined;
}
