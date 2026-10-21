import type FlexSearch from 'flexsearch';
import { encodeHeadwordForSearch } from '../../models/dictionary-headword-index.model';
import type { DictionaryEditionSource, DictionarySearchMatch } from '../../models/dictionary.model';

/** One ready edition's search index, paired with its Resource identity. */
export interface SearchableDictionary {
	readonly source: DictionaryEditionSource;
	readonly index: FlexSearch.Index;
	readonly headwordCount: number;
}

/** Search one edition's headword prefixes without loading definition HTML. */
export async function findHeadwordMatches(
	query: string,
	{ source, index, headwordCount }: SearchableDictionary
): Promise<DictionarySearchMatch[]> {
	const candidates = await index.searchAsync(encodeHeadwordForSearch(query), headwordCount);
	const matches: DictionarySearchMatch[] = [];
	for (const id of candidates) {
		const headwordKey = String(id);
		// Verify the whole canonical prefix, including spaces and punctuation.
		if (!headwordKey.startsWith(query)) continue;
		matches.push({
			...source,
			headwordKey
		});
	}
	// Exact hits first; stable, locale-independent ordering within the edition.
	return matches.sort((a, b) =>
		Number(b.headwordKey === query) - Number(a.headwordKey === query) ||
		(a.headwordKey < b.headwordKey ? -1 : a.headwordKey > b.headwordKey ? 1 : 0)
	);
}
