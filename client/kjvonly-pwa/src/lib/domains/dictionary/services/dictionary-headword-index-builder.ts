import FlexSearch from 'flexsearch';
import { createDictionaryHeadwordIndexId, encodeHeadwordForSearch, DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION, DICTIONARY_HEADWORD_INDEX_TOKENIZER, type DictionaryHeadwordIndex } from '../models/dictionary-headword-index.model';
import type { DictionaryEditionSource, DictionaryEntriesBundle } from '../models/dictionary.model';

import type { DictionaryPublishedIndexStore } from '../persistence/dictionary-published-index-store';

/** Build the accepted edition's headword-only index, preferring a compatible published export. */
export async function createDictionaryHeadwordIndex(
	source: DictionaryEditionSource,
	sourceRevision: number,
	bundle: DictionaryEntriesBundle,
	publishedIndexes: DictionaryPublishedIndexStore | undefined
): Promise<DictionaryHeadwordIndex> {
	const headwords = Object.keys(bundle);
	const publishedChunks = await findCompatiblePublishedIndex(source, headwords, publishedIndexes);
	const chunks = publishedChunks ?? await buildLocalHeadwordIndex(headwords);
	return {
		...source,
		id: createDictionaryHeadwordIndexId(source),
		sourceRevision,
		formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
		headwordCount: headwords.length,
		chunks
	};
}

/** Confirm every accepted headword exists; matching counts alone cannot detect stale exports. */
async function findCompatiblePublishedIndex(
	source: DictionaryEditionSource,
	headwords: readonly string[],
	publishedIndexes: DictionaryPublishedIndexStore | undefined
): Promise<Readonly<Record<string, string>> | undefined> {
	if (!publishedIndexes) return;
	try {
		const published = await publishedIndexes.get(source);
		if (!published || published.headwordCount !== headwords.length) return;
		const probe = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
		for (const [key, data] of Object.entries(published.chunks)) {
			await probe.import(key, data);
		}
		if (!headwords.every(headword => probe.contain(headword))) return;
		console.info('[Dictionary index] Using compatible published index.', source.resourceId);
		return published.chunks;
	} catch {
		return;
	}
}

/** Generate a compatible local FlexSearch export when no verified published export exists. */
async function buildLocalHeadwordIndex(headwords: readonly string[]): Promise<Record<string, string>> {
	const index = new FlexSearch.Index({ tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER, encode: false });
	for (const headword of headwords) {
		index.add(headword, encodeHeadwordForSearch(headword));
	}
	const chunks: Record<string, string> = {};
	await index.export((key: string, data: string | undefined) => {
		chunks[key] = data ?? '';
	});
	return chunks;
}
