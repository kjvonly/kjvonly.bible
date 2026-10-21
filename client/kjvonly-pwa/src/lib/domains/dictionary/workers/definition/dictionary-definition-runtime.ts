import type { DictionaryEditionSource, DictionaryDefinition } from '../../models/dictionary.model';
import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';

import type { DictionaryHeadwordSourceStore } from '../../persistence/dictionary-headword-source-store';
import type { DictionaryChunkStore } from '../../persistence/dictionary-chunk-store';
import { validateDictionaryChunkMap } from '../../models/dictionary-chunk.model';
import { findDictionaryChunkRange } from '../../services/dictionary-chunk-locator';
import { decompressDictionaryChunk } from './dictionary-definition-decoder';

/** Resolve one selected headword for worker-side normalization. */
export class DictionaryDefinitionRuntime {
	constructor(
		private readonly editions: Pick<DictionaryHeadwordSourceStore, 'getEdition'>,
		private readonly chunks: DictionaryChunkStore,
		private readonly decompress: (gzip: Uint8Array) => Promise<string> = decompressDictionaryChunk
	) {}

	/** Resolve the selected headword inside the worker without exposing other chunk entries. */
	async getDefinitions(source: DictionaryEditionSource, headwordKey: string): Promise<readonly DictionaryDefinition[]> {
		this.assertCanonicalHeadword(headwordKey);
		const edition = await this.editions.getEdition(source);
		if (!edition?.chunkGeneration || !edition.chunkCount) {
			throw new Error(`Dictionary chunked edition is not installed: ${source.resourceId}`);
		}
		const map = await this.loadAcceptedChunkMap(source, edition.chunkGeneration, edition.chunkCount);
		const range = findDictionaryChunkRange(map, headwordKey);
		if (!range) throw new Error(`Dictionary headword is not installed: ${headwordKey}`);
		const chunk = await this.loadSelectedChunk(source, edition.chunkGeneration, range);
		return this.extractDefinitions(chunk.gzip, chunk.uncompressedBytes, headwordKey);
	}

	/** Ensure callers use the same normalization policy as the persisted range map. */
	private assertCanonicalHeadword(key: string): void {
		if (!key || normalizeDictionaryHeadword(key) !== key) {
			throw new Error(`Invalid Dictionary headword key: ${key}`);
		}
	}

	/** Reject a missing, stale, or incompatible locator before reading any HTML bytes. */
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
	private async extractDefinitions(
		gzip: Uint8Array,
		expectedBytes: number,
		headwordKey: string
	): Promise<readonly DictionaryDefinition[]> {
		const json = await this.decompress(gzip);
		if (new TextEncoder().encode(json).byteLength !== expectedBytes) {
			throw new Error(`Dictionary chunk has an invalid uncompressed size: ${headwordKey}`);
		}
		const content: unknown = JSON.parse(json);
		if (!isRecord(content)) throw new Error('Dictionary chunk must be a keyed JSON object.');
		const definitions: unknown = Object.hasOwn(content, headwordKey) ? content[headwordKey] : undefined;
		if (!isDefinitions(definitions)) throw new Error(`Dictionary chunk has no valid definitions for: ${headwordKey}`);
		return definitions;
	}
}

/** Strictly check only the selected definition array; no arbitrary chunk fields are returned. */
function isDefinitions(value: unknown): value is readonly DictionaryDefinition[] {
	return Array.isArray(value) && value.length > 0 && value.every(item =>
		isRecord(item) && typeof item.word === 'string' && item.word.trim().length > 0 &&
		typeof item.content === 'string' && item.content.trim().length > 0
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
