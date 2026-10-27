import FlexSearch from 'flexsearch';
import {
	createDictionaryHeadwordIndexId,
	DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
	DICTIONARY_HEADWORD_INDEX_TOKENIZER,
	type DictionaryHeadwordIndex
} from '../models/dictionary-headword-index.model';
import type { DictionaryEditionSource, DictionaryEditionBundle } from '../models/dictionary.model';
import type { DictionaryPublishedIndexStore } from '../persistence/dictionary-published-index-store';

/** Install the already-built published index; Dictionary workers never generate FlexSearch documents. */
export async function acceptPublishedDictionaryHeadwordIndex(
	source: DictionaryEditionSource,
	sourceRevision: number,
	bundle: DictionaryEditionBundle,
	publishedIndexes: DictionaryPublishedIndexStore
): Promise<DictionaryHeadwordIndex> {
	const published = await publishedIndexes.get(source);
	if (!published) {
		throw new Error(`Published Dictionary headword index is not installed: ${source.resourceId}`);
	}

	const headwords = bundle.headwords;
	if (published.headwordCount !== headwords.length) {
		throw new Error(`Published Dictionary headword index does not match the edition: ${source.resourceId}`);
	}

	// Every indexed association must exist, including repeated words or definition keys.
	try {
		const index = new FlexSearch.Document({
			tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER,
			encode: false,
			document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
		});
		for (const [key, value] of Object.entries(published.chunks)) {
			await index.import(key, value);
		}
		if (!headwords.every(({ headword, key }) => index.contain(JSON.stringify([headword, key])))) {
			throw new Error('Headword membership mismatch');
		}
	} catch {
		throw new Error(`Published Dictionary headword index is incompatible: ${source.resourceId}`);
	}

	return {
		...source,
		id: createDictionaryHeadwordIndexId(source),
		sourceRevision,
		formatVersion: DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION,
		headwordCount: published.headwordCount,
		chunks: published.chunks
	};
}
