import type FlexSearch from 'flexsearch';
import { encodeHeadwordForSearch } from '../../models/dictionary-headword-index.model';
import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';
import type { DictionaryEditionSource, DictionarySearchMatch, HeadwordMatch } from '../../models/dictionary.model';

/** One ready edition's imported search index, paired with its Resource identity. */
export interface SearchableDictionary {
	readonly source: DictionaryEditionSource;
	readonly index: FlexSearch.Document;
	readonly headwordCount: number;
}

/** Search imported document metadata; no definition access or custom lookup maps. */
export async function findHeadwordMatches(
	query: string,
	{ source, index, headwordCount }: SearchableDictionary
): Promise<DictionarySearchMatch[]> {
	// FlexSearch 0.7's enriched Document results have incomplete TypeScript declarations.
	const fields = index.search(encodeHeadwordForSearch(query), { enrich: true, limit: headwordCount }) as unknown as
		Array<{ result: Array<{ doc: HeadwordMatch }> }>;
	// A document can match both indexed fields. Return each headword/key pair once.
	const matches = new Map<string, DictionarySearchMatch>();
	for (const field of fields) {
		for (const { doc } of field.result) {
			if (!doc.headword.startsWith(query) && !normalizeDictionaryHeadword(doc.key).startsWith(query)) continue;
			matches.set(JSON.stringify([doc.headword, doc.key]), { ...source, ...doc });
		}
	}
	// Exact keys (G1 before G10) then exact headwords, followed by prefixes.
	return [...matches.values()].sort((a, b) =>
		Number(normalizeDictionaryHeadword(b.key) === query) - Number(normalizeDictionaryHeadword(a.key) === query) ||
		Number(b.headword === query) - Number(a.headword === query) ||
		(a.headword < b.headword ? -1 : a.headword > b.headword ? 1 : 0) ||
		(a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
	);
}
