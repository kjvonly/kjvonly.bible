import FlexSearch from 'flexsearch';
import { DICTIONARY_HEADWORD_INDEX_TOKENIZER, createDictionaryHeadwordIndexId, type DictionaryHeadwordIndex } from '../../models/dictionary-headword-index.model';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../../models/dictionary.model';

import type { DictionaryHeadwordIndexStore } from '../../persistence/dictionary-headword-index-store';
import type { DictionaryHeadwordSourceStore } from '../../persistence/dictionary-headword-source-store';

/** An edition's currently accepted, worker-local FlexSearch index (no definitions). */
export interface LoadedDictionaryHeadwordIndex {
	readonly revision: number;
	readonly headwordCount: number;
	readonly index: FlexSearch.Document;
}

/**
 * Imports the index installed atomically with an edition's chunk map and manifest.
 * Index generation belongs to the publication script; searching never scans
 * individual definitions or decompresses definition chunks.
 */
export class DictionaryHeadwordIndexManager {
	private readonly loaded = new Map<string, LoadedDictionaryHeadwordIndex>();
	private readonly initializing = new Map<string, Promise<LoadedDictionaryHeadwordIndex>>();

	constructor(
		private readonly sources: DictionaryHeadwordSourceStore,
		private readonly indexes: DictionaryHeadwordIndexStore
	) {}

	/**
	 * Imports the accepted edition's persisted index once per worker session.
	 * Concurrent calls share initialization, and a new accepted revision replaces
	 * the worker-local index without deleting any IndexedDB objects.
	 */
	async ensure(source: DictionaryEditionSource): Promise<LoadedDictionaryHeadwordIndex> {
		const edition = await this.sources.getEdition(source);
		if (!edition) throw new Error(`Dictionary chunk edition is not installed: ${source.resourceId}`);

		const id = createDictionaryHeadwordIndexId(source);
		const current = this.loaded.get(id);
		if (this.matchesEdition(current, edition)) return current!;

		const pending = this.initializing.get(id);
		if (pending) {
			const existing = await pending;
			return this.matchesEdition(existing, edition) ? existing : this.ensure(source);
		}

		const operation = this.loadAcceptedIndex(source, edition);
		this.initializing.set(id, operation);
		try {
			return await operation;
		} finally {
			if (this.initializing.get(id) === operation) this.initializing.delete(id);
		}
	}

	/** Refuses a missing, stale, or corrupt index without scanning definitions. */
	private async loadAcceptedIndex(
		source: DictionaryEditionSource,
		edition: DictionaryEditionManifest
	): Promise<LoadedDictionaryHeadwordIndex> {
		const stored = await this.indexes.get(source, edition.modifiedAt);
		if (!stored) {
			throw new Error(`Dictionary headword index is missing or incompatible: ${source.resourceId}`);
		}

		const index = await this.importIndex(source, stored);
		await this.assertEditionUnchanged(source, edition);

		const loaded = { index, revision: edition.modifiedAt, headwordCount: stored.headwordCount };
		this.loaded.set(createDictionaryHeadwordIndexId(source), loaded);
		return loaded;
	}

	/** Import FlexSearch's serialized postings; only headword data crosses this boundary. */
	private async importIndex(source: DictionaryEditionSource, stored: DictionaryHeadwordIndex): Promise<FlexSearch.Document> {
		try {
			const index = new FlexSearch.Document({
				tokenize: DICTIONARY_HEADWORD_INDEX_TOKENIZER,
				encode: false,
				document: { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] }
			});
			for (const [key, value] of Object.entries(stored.chunks)) {
				await index.import(key, value);
			}
			return index;
		} catch {
			throw new Error(`Dictionary headword index could not be imported: ${source.resourceId}`);
		}
	}

	/** Prevents an in-flight import from installing the wrong accepted generation. */
	private async assertEditionUnchanged(source: DictionaryEditionSource, expected: DictionaryEditionManifest): Promise<void> {
		const current = await this.sources.getEdition(source);
		if (!current || current.modifiedAt !== expected.modifiedAt ||
			current.entryCount !== expected.entryCount ||
			current.chunkGeneration !== expected.chunkGeneration) {
			throw new Error(`Dictionary edition changed while loading its index: ${source.resourceId}`);
		}
	}

	/** The accepted Resource revision scopes the imported index; definition count is unrelated. */
	private matchesEdition(
		value: LoadedDictionaryHeadwordIndex | undefined,
		edition: DictionaryEditionManifest
	): value is LoadedDictionaryHeadwordIndex {
		return value?.revision === edition.modifiedAt;
	}
}
