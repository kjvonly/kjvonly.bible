import type { DictionaryEditionSource } from '../../models/dictionary.model';

import type { DictionaryHeadwordSourceStore } from '../../persistence/dictionary-headword-source-store';
import type { DictionaryChunkStore } from '../../persistence/dictionary-chunk-store';
import { validateDictionaryChunkMap } from '../../models/dictionary-chunk.model';
import { findDictionaryChunkRange } from '../../services/dictionary-chunk-locator';
import { decompressDictionaryChunk } from './dictionary-definition-decoder';

/** Retrieve one definition value by opaque key from a compressed edition chunk. */
export class DictionaryDefinitionRuntime {
	constructor(
		private readonly editions: Pick<DictionaryHeadwordSourceStore, 'getEdition'>,
		private readonly chunks: DictionaryChunkStore,
		private readonly decompress: (gzip: Uint8Array) => Promise<string> = decompressDictionaryChunk
	) {}

	/** Read one stored definition without making assumptions about its format. */
	async get(source: DictionaryEditionSource, key: string): Promise<unknown> {
		if (!key) {
			throw new Error('Dictionary definition key cannot be empty.');
		}
		const edition = await this.editions.getEdition(source);
		if (!edition?.chunkGeneration || !edition.chunkCount) {
			throw new Error(`Dictionary chunked edition is not installed: ${source.resourceId}`);
		}
		const map = await this.loadAcceptedChunkMap(source, edition.chunkGeneration, edition.chunkCount);
		const range = findDictionaryChunkRange(map, key);
		if (!range) throw new Error(`Dictionary definition is not installed: ${key}`);
		const chunk = await this.loadSelectedChunk(source, edition.chunkGeneration, range);
		return this.extractDefinition(chunk.gzip, chunk.uncompressedBytes, key);
	}

	/** Reject a missing, stale, or incompatible locator before reading any compressed data. */
	private async loadAcceptedChunkMap(
		source: DictionaryEditionSource,
		generation: string,
		chunkCount: number
	) {
		const map = await this.chunks.getMap(source, generation);
		if (!map) throw new Error(`Dictionary chunk-map is not installed: ${source.resourceId}`);
		validateDictionaryChunkMap(map);
		if (map.ranges.length !== chunkCount) throw new Error('Dictionary chunk-map count disagrees with accepted edition.');
		return map;
	}

	/** Verify the stored chunk is exactly the one advertised by the locator. */
	private async loadSelectedChunk(
		source: DictionaryEditionSource,
		generation: string,
		range: { readonly chunkId: string; readonly firstKey: string; readonly lastKey: string }
	) {
		const ordinal = Number(range.chunkId);
		const chunk = await this.chunks.getChunk(source, generation, ordinal);
		if (!chunk || chunk.chunkId !== range.chunkId || chunk.firstKey !== range.firstKey || chunk.lastKey !== range.lastKey) {
			throw new Error(`Dictionary chunk is missing or inconsistent: ${range.chunkId}`);
		}
		return chunk;
	}

	/** Parse one bounded chunk inside the worker, keeping all other definitions off the main thread. */
	private async extractDefinition(
		gzip: Uint8Array,
		expectedBytes: number,
		key: string
	): Promise<unknown> {
		const json = await this.decompress(gzip);
		if (new TextEncoder().encode(json).byteLength !== expectedBytes) {
			throw new Error(`Dictionary chunk has an invalid uncompressed size: ${key}`);
		}
		const content: unknown = JSON.parse(json);
		if (!isRecord(content)) throw new Error('Dictionary chunk must be a keyed JSON object.');
		const definition: unknown = Object.hasOwn(content, key) ? content[key] : undefined;
		if (definition === undefined) throw new Error(`Dictionary chunk has no definition for: ${key}`);
		return definition;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
