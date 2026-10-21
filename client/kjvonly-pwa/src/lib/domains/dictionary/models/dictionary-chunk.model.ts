import { createDictionaryChunkMapObjectId, formatDictionaryChunkId } from './dictionary-chunk-identity';
import { compareDictionaryHeadwordKeys, normalizeDictionaryHeadword } from './dictionary-identity';
import type { DictionaryEditionSource } from './dictionary.model';

/** Domain object types for locally compressed Dictionary definition storage. */
export const DICTIONARY_CHUNK_OBJECT_TYPE = 'dictionary/chunk';
export const DICTIONARY_CHUNK_MAP_OBJECT_TYPE = 'dictionary/chunk-map';

/**
 * A persistent, gzip-compressed group of adjacent Dictionary headwords.
 * `gzip` contains a keyed DictionaryEntriesBundle, never an encoded JSON string.
 */
export interface DictionaryChunk {
	readonly id: string;
	readonly source: DictionaryEditionSource;
	readonly generation: string;
	readonly chunkId: string;
	readonly ordinal: number;
	readonly firstKey: string;
	readonly lastKey: string;
	readonly uncompressedBytes: number;
	readonly compressedBytes: number;
	readonly gzip: Uint8Array;
}

/** Inclusive, ordered bounds for a single compressed Dictionary chunk. */
export interface DictionaryChunkRange {
	readonly chunkId: string;
	readonly firstKey: string;
	readonly lastKey: string;
}

/** One generation's compact lookup table; it never contains HTML definitions. */
export interface DictionaryChunkMap {
	readonly id: string;
	readonly source: DictionaryEditionSource;
	readonly generation: string;
	readonly ranges: readonly DictionaryChunkRange[];
}

/**
 * An uncompressed, serialized chunk ready for worker-side gzip compression.
 * A generator yields one partition at a time to avoid buffering the full
 * dictionary as a second collection of Domain-object candidates.
 */
export interface DictionaryChunkPartition extends DictionaryChunkRange {
	readonly ordinal: number;
	readonly uncompressedBytes: number;
	readonly serializedJson: string;
}

/** Construct an edition-generation locator from the ranges emitted at installation. */
export function createDictionaryChunkMap(
	source: DictionaryEditionSource,
	generation: string,
	ranges: readonly DictionaryChunkRange[]
): DictionaryChunkMap {
	const map: DictionaryChunkMap = {
		id: createDictionaryChunkMapObjectId(source, generation),
		source: { ...source },
		generation,
		ranges: ranges.map(range => ({ ...range }))
	};
	validateDictionaryChunkMap(map);
	return map;
}

/**
 * Validate untrusted persisted locator metadata once when importing it.
 * Ranges must be ordered and disjoint, with unique ordinal chunk IDs; gaps
 * between ranges are legal because not every possible word is in a dictionary.
 */
export function validateDictionaryChunkMap(value: unknown): asserts value is DictionaryChunkMap {
	if (!isRecord(value)) {
		throw new Error('Invalid Dictionary chunk-map object.');
	}
	const map = value;
	if (
		!isRecord(map.source) ||
		typeof map.source.publisher !== 'string' ||
		typeof map.source.resourceId !== 'string' ||
		typeof map.generation !== 'string' ||
		typeof map.id !== 'string' ||
		!Array.isArray(map.ranges)
	) {
		throw new Error('Invalid Dictionary chunk-map metadata.');
	}
	if (map.id !== createDictionaryChunkMapObjectId(
		{ publisher: map.source.publisher, resourceId: map.source.resourceId },
		map.generation
	)) {
		throw new Error('Dictionary chunk-map identity does not match its source.');
	}
	if (map.ranges.length === 0) {
		throw new Error('Dictionary chunk-map requires at least one range.');
	}
	let previousLast: string | undefined;
	const seenChunkIds = new Set<string>();
	for (const [index, range] of map.ranges.entries()) {
		if (
			!isRecord(range) ||
			typeof range.chunkId !== 'string' ||
			typeof range.firstKey !== 'string' ||
			typeof range.lastKey !== 'string'
		) {
			throw new Error(`Invalid Dictionary chunk range at position ${index}.`);
		}
		if (
			!range.firstKey ||
			range.firstKey !== normalizeDictionaryHeadword(range.firstKey) ||
			!range.lastKey ||
			range.lastKey !== normalizeDictionaryHeadword(range.lastKey) ||
			compareDictionaryHeadwordKeys(range.firstKey, range.lastKey) > 0
		) {
			throw new Error(`Invalid Dictionary chunk range: ${range.firstKey}..${range.lastKey}`);
		}
		if (
			previousLast !== undefined &&
			compareDictionaryHeadwordKeys(previousLast, range.firstKey) >= 0
		) {
			throw new Error(`Overlapping or unordered Dictionary chunk range: ${range.firstKey}`);
		}
		const ordinal = Number(range.chunkId);
		if (!Number.isSafeInteger(ordinal) || formatDictionaryChunkId(ordinal) !== range.chunkId) {
			throw new Error(`Invalid Dictionary chunk ID: ${range.chunkId}`);
		}
		if (seenChunkIds.has(range.chunkId)) {
			throw new Error(`Duplicate Dictionary chunk ID: ${range.chunkId}`);
		}
		seenChunkIds.add(range.chunkId);
		if (range.chunkId !== formatDictionaryChunkId(index)) {
			throw new Error(`Nonsequential Dictionary chunk ID: ${range.chunkId}`);
		}
		previousLast = range.lastKey;
	}
}

/** Narrow an untrusted persisted value without depending on its prototype. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
