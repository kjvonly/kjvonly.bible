import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';
import { createDictionaryChunkMapObjectId, createDictionaryChunkObjectId, formatDictionaryChunkId } from '../models/dictionary-chunk-identity';
import { DICTIONARY_CHUNK_MAP_OBJECT_TYPE, DICTIONARY_CHUNK_OBJECT_TYPE, type DictionaryChunk, type DictionaryChunkMap } from '../models/dictionary-chunk.model';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import { DICTIONARY_CHUNK_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION, DICTIONARY_CHUNK_MAP_DATA_TYPE } from '../resources/entries/dictionary-resource-contract';
import type { DictionaryChunkStore } from './dictionary-chunk-store';

/** IndexedDB adapter for generation-scoped compressed Dictionary Domain objects. */
export class IndexedDBDictionaryChunkStore implements DictionaryChunkStore {
	constructor(private readonly getDB: () => Promise<ApplicationDB>) {}

	/** Read one locator without enumerating or deserializing definition chunks. */
	async getMap(source: DictionaryEditionSource, generation: string): Promise<DictionaryChunkMap | undefined> {
		const id = createDictionaryChunkMapObjectId(source, generation);
		const db = await this.getDB();
		const stored = await db.get(DOMAIN_OBJECTS, createStoredDomainObjectId(DICTIONARY_CHUNK_MAP_OBJECT_TYPE, id));
		if (!matchesStoredObject(stored, DICTIONARY_CHUNK_MAP_OBJECT_TYPE, id, DICTIONARY_CHUNK_MAP_DATA_TYPE)) return undefined;
		const map = stored.value as DictionaryChunkMap;
		if (!map || map.id !== id || map.generation !== generation ||
			map.source?.publisher !== source.publisher || map.source?.resourceId !== source.resourceId) {
			throw new Error(`Invalid persisted Dictionary chunk-map: ${id}`);
		}
		return map;
	}

	/** Read only the compressed bytes for the located chunk. */
	async getChunk(source: DictionaryEditionSource, generation: string, ordinal: number): Promise<DictionaryChunk | undefined> {
		const id = createDictionaryChunkObjectId(source, generation, ordinal);
		const db = await this.getDB();
		const stored = await db.get(DOMAIN_OBJECTS, createStoredDomainObjectId(DICTIONARY_CHUNK_OBJECT_TYPE, id));
		if (!matchesStoredObject(stored, DICTIONARY_CHUNK_OBJECT_TYPE, id, DICTIONARY_CHUNK_DATA_TYPE)) return undefined;
		const chunk = stored.value as DictionaryChunk;
		if (!chunk || chunk.id !== id || chunk.generation !== generation ||
			chunk.source?.publisher !== source.publisher || chunk.source?.resourceId !== source.resourceId ||
			chunk.ordinal !== ordinal || chunk.chunkId !== formatDictionaryChunkId(ordinal) ||
			!Number.isSafeInteger(chunk.uncompressedBytes) || chunk.uncompressedBytes < 2 ||
			!Number.isSafeInteger(chunk.compressedBytes) || chunk.compressedBytes < 1 ||
			!(chunk.gzip instanceof Uint8Array) || chunk.gzip.byteLength !== chunk.compressedBytes
		) throw new Error(`Invalid persisted Dictionary chunk: ${id}`);
		return chunk;
	}
}

/** Match the persisted Domain-object envelope before interpreting its value. */
function matchesStoredObject(
	stored: StoredDomainObject | undefined,
	objectType: string,
	objectId: string,
	dataType: string
): stored is StoredDomainObject {
	return stored?.id === createStoredDomainObjectId(objectType, objectId) &&
		stored.objectType === objectType && stored.objectId === objectId &&
		stored.dataType === dataType && stored.dataVersion === DICTIONARY_CHUNK_DATA_VERSION;
}
