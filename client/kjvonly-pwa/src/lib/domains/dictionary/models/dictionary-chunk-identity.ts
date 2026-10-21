import { createDictionaryEditionId, parseDictionaryResourceId } from './dictionary-identity';
import type { DictionaryEditionSource } from './dictionary.model';

/** Stable IDs within a generation, with four digits for readable sorting. */
export function formatDictionaryChunkId(ordinal: number): string {
	if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
		throw new Error(`Invalid Dictionary chunk ordinal: ${ordinal}`);
	}
	return String(ordinal).padStart(4, '0');
}

/**
 * The source Resource's accepted modification time identifies a generation.
 * Currentness follows the existing Resource lifecycle, not chunk timestamps.
 */
export function createDictionaryChunkGeneration(modifiedAt: number): string {
	if (!Number.isSafeInteger(modifiedAt) || modifiedAt < 0) {
		throw new Error(`Invalid Dictionary Resource revision: ${modifiedAt}`);
	}
	return `m${modifiedAt}`;
}

/** Resolve a source/generation prefix without conflating different publishers. */
export function createDictionaryChunkGenerationId(
	source: DictionaryEditionSource,
	generation: string
): string {
	const { edition } = parseDictionaryResourceId(source.resourceId);
	if (!generation || !/^m\d+$/.test(generation)) {
		throw new Error(`Invalid Dictionary chunk generation: ${generation}`);
	}
	return `${createDictionaryEditionId(source.publisher, edition)}/${encodeURIComponent(source.resourceId)}/${generation}`;
}

/** Primary Domain-object identity for one compressed chunk. */
export function createDictionaryChunkObjectId(
	source: DictionaryEditionSource,
	generation: string,
	ordinal: number
): string {
	return `${createDictionaryChunkGenerationId(source, generation)}/chunk/${formatDictionaryChunkId(ordinal)}`;
}

/** Primary Domain-object identity for one generation's chunk locator. */
export function createDictionaryChunkMapObjectId(
	source: DictionaryEditionSource,
	generation: string
): string {
	return `${createDictionaryChunkGenerationId(source, generation)}/chunk-map`;
}
