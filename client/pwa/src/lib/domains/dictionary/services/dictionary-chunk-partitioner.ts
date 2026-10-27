import { formatDictionaryChunkId } from '../models/dictionary-chunk-identity';
import type { DictionaryChunkPartition } from '../models/dictionary-chunk.model';
import type { DictionaryEditionBundle } from '../models/dictionary.model';
import { compareDictionaryDefinitionKeys } from '../models/dictionary-identity';

/**
 * Partition a validated keyed dictionary into size-bounded JSON objects.
 *
 * Each complete definition value stays in one chunk, identified by its opaque key. Size is
 * measured as UTF-8 bytes of the actual serialized JSON (including keys,
 * commas, and braces). A single oversized definition forms an oversized chunk.
 * Yielding one chunk at a time allows its consumer to gzip/persist it before
 * requesting the next partition; no gzip or IndexedDB work occurs here.
 */
export function* partitionDictionaryIntoChunks(
	bundle: DictionaryEditionBundle,
	targetBytes: number
): Generator<DictionaryChunkPartition> {
	if (!Number.isSafeInteger(targetBytes) || targetBytes < 2) {
		throw new Error(`Invalid Dictionary chunk target bytes: ${targetBytes}`);
	}

	const keys = Object.keys(bundle.definitions).sort(compareDictionaryDefinitionKeys);
	if (keys.length === 0) {
		throw new Error('Cannot partition an empty Dictionary edition.');
	}

	const encoder = new TextEncoder();
	let ordinal = 0;
	let fragments: string[] = [];
	let firstKey = '';
	let lastKey = '';
	let size = 2; // Opening and closing object braces.

	for (const key of keys) {
		if (!key) {
			throw new Error('Dictionary definition key cannot be empty.');
		}
		const entry = `${JSON.stringify(key)}:${JSON.stringify(bundle.definitions[key])}`;
		const entryBytes = encoder.encode(entry).byteLength;
		const nextSize = size + entryBytes + (fragments.length > 0 ? 1 : 0);

		if (fragments.length > 0 && nextSize > targetBytes) {
			yield createPartition(ordinal++, firstKey, lastKey, fragments, size);
			fragments = [];
			firstKey = '';
			size = 2;
		}

		if (fragments.length === 0) {
			firstKey = key;
		} else {
			size += 1; // Comma before the next member.
		}
		fragments.push(entry);
		lastKey = key;
		size += entryBytes;
	}

	if (fragments.length > 0) {
		yield createPartition(ordinal, firstKey, lastKey, fragments, size);
	}
}

/** Finish one JSON object without re-serializing its definition groups. */
function createPartition(
	ordinal: number,
	firstKey: string,
	lastKey: string,
	fragments: readonly string[],
	uncompressedBytes: number
): DictionaryChunkPartition {
	return {
		ordinal,
		chunkId: formatDictionaryChunkId(ordinal),
		firstKey,
		lastKey,
		uncompressedBytes,
		serializedJson: `{${fragments.join(',')}}`
	};
}
