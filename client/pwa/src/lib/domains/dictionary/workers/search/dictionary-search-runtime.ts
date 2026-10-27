import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';
import type { DictionaryEditionSource, DictionarySearchMatch } from '../../models/dictionary.model';
import type { DictionaryHeadwordIndexStore } from '../../persistence/dictionary-headword-index-store';
import type { DictionaryHeadwordSourceStore } from '../../persistence/dictionary-headword-source-store';
import { DictionaryHeadwordIndexManager } from './dictionary-headword-index-manager';
import { findHeadwordMatches } from './dictionary-headword-matcher';

/**
 * Worker search facade. Searches one Resource per request while reusing cached
 * indexes across different Dictionary panes and edition selections.
 */
export class DictionarySearchRuntime {
	private readonly indexes: DictionaryHeadwordIndexManager;

	constructor(sources: DictionaryHeadwordSourceStore, cache: DictionaryHeadwordIndexStore) {
		this.indexes = new DictionaryHeadwordIndexManager(sources, cache);
	}

	/** Search the selected edition; missing or incompatible indexes fail the request. */
	async search(query: string, source: DictionaryEditionSource): Promise<DictionarySearchMatch[]> {
		const prefix = validateSearchQuery(query);
		if (!prefix) return [];
		const ready = await this.indexes.ensure(source);
		return findHeadwordMatches(prefix, {
			source, index: ready.index, headwordCount: ready.headwordCount
		});
	}
}

/** Validate and canonicalize a user's headword prefix before querying FlexSearch. */
function validateSearchQuery(query: string): string {
	if (query.length > 256) throw new Error('Dictionary search query is too long.');
	return normalizeDictionaryHeadword(query);
}
