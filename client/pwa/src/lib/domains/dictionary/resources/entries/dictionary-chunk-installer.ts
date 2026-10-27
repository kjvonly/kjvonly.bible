import { createStoredDomainObjectId, type StoredDomainObject } from '$lib/infrastructure/persistence/application.db';
import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type GenericResourceInstallationTransaction,
	type ResourceInstallation
} from '$lib/resource';
import { createDictionaryChunkGeneration, createDictionaryChunkObjectId } from '../../models/dictionary-chunk-identity';
import { createDictionaryChunkMap, type DictionaryChunk, type DictionaryChunkMap, type DictionaryChunkRange } from '../../models/dictionary-chunk.model';
import type { DictionaryEditionSource, DictionaryEditionManifest, DictionaryEditionBundle } from '../../models/dictionary.model';
import { createDictionaryEditionId, parseDictionaryResourceId } from '../../models/dictionary-identity';

import type { DictionaryHeadwordIndex } from '../../models/dictionary-headword-index.model';
import {
	DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE, DICTIONARY_HEADWORD_INDEX_DATA_TYPE,
	DICTIONARY_HEADWORD_INDEX_DATA_VERSION
} from '../../persistence/dictionary-headword-index-store';
import { acceptPublishedDictionaryHeadwordIndex } from '../../services/dictionary-published-headword-index-acceptance';
import { partitionDictionaryIntoChunks, type DictionaryChunkPartition } from '../../services/dictionary-chunk-partitioner';
import {
	DICTIONARY_CHUNK_DATA_TYPE, DICTIONARY_CHUNK_DATA_VERSION,
	DICTIONARY_CHUNK_MAP_DATA_TYPE, DICTIONARY_EDITION_DATA_TYPE,
	DICTIONARY_EDITION_OBJECT_TYPE, DICTIONARY_DATA_VERSION
} from './dictionary-resource-contract';
import { DICTIONARY_CHUNK_OBJECT_TYPE, DICTIONARY_CHUNK_MAP_OBJECT_TYPE } from '../../models/dictionary-chunk.model';
import { gzipDictionaryChunk } from './dictionary-chunk-compressor';
import type { DictionaryPublishedIndexStore } from '../../persistence/dictionary-published-index-store';

/** Target approximate uncompressed JSON size; never divides one definition. */
export const DICTIONARY_CHUNK_TARGET_BYTES = 384 * 1024;
/** Bound compressed bytes and IndexedDB requests kept in one transaction. */
export const DICTIONARY_CHUNK_WRITE_BATCH_SIZE = 4;
const WRITE_PAUSE_MS = 20;

interface ChunkCandidate {
	readonly objectType: string;
	readonly objectId: string;
	readonly dataType: string;
	readonly dataVersion: number;
	readonly value: unknown;
}

/** Identity and revision context shared by one dictionary installation attempt. */
interface DictionaryInstallationContext {
	readonly edition: string;
	readonly editionId: string;
	readonly source: DictionaryEditionSource;
	readonly generation: string;
}

/** Mutable counters and chunk boundaries for one installation attempt. */
interface DictionaryInstallationProgress {
	readonly ranges: DictionaryChunkRange[];
	chunks: number;
	chunksWritten: number;
	batchesCommitted: number;
}

/** Worker-side install counters; no per-headword console logs. */
export interface DictionaryChunkInstallationTiming {
	readonly resourceId: string;
	readonly status: 'completed' | 'interrupted' | 'older';
	readonly chunks: number;
	readonly chunksWritten: number;
	readonly batchesCommitted: number;
	readonly totalMs: number;
}

/**
 * Accept one dictionary as immutable gzip chunks, never as per-word Domain objects.
 * Each bounded transaction commits chunks and their receipts; a final atomic
 * transaction writes the locator and edition manifest, which is the completion
 * marker. A failed/retried install never deletes or exposes a partial generation.
 */
export class DictionaryChunkInstaller {
	constructor(
		private readonly transaction: GenericResourceInstallationTransaction,
		private readonly publishedIndexes: DictionaryPublishedIndexStore,
		private readonly compress: (json: string) => Promise<Uint8Array> = gzipDictionaryChunk,
		private readonly pause: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, WRITE_PAUSE_MS)),
		private readonly report: (timing: DictionaryChunkInstallationTiming) => void = timing => console.info('[Dictionary chunk install timing]', timing),
		private readonly batchSize = DICTIONARY_CHUNK_WRITE_BATCH_SIZE,
		private readonly targetBytes = DICTIONARY_CHUNK_TARGET_BYTES
	) {
		if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error('Invalid Dictionary chunk write batch size.');
		if (!Number.isSafeInteger(targetBytes) || targetBytes < 2) throw new Error('Invalid Dictionary chunk target size.');
	}

	/**
	 * Coordinate the installation without owning compression, persistence, or
	 * completion details. An interrupted attempt never publishes a new edition.
	 */
	async install(resource: DecodedResourceContent, bundle: DictionaryEditionBundle): Promise<void> {
		const startedAt = performance.now();
		const context = this.createInstallationContext(resource);
		const progress = this.createInstallationProgress();
		let status: DictionaryChunkInstallationTiming['status'] = 'interrupted';

		try {
			if (await this.isOlderThanAcceptedEdition(resource, context.editionId)) {
				status = 'older';
				return;
			}

			// Reject an unavailable or incompatible published index before writing any chunks.
			const index = await acceptPublishedDictionaryHeadwordIndex(context.source, resource.modifiedAt, bundle, this.publishedIndexes);
			await this.persistCompressedChunks(resource, bundle, context, progress);
			await this.publishCompletedEdition(resource, bundle, context, progress, index);
			status = 'completed';
		} finally {
			this.reportInstallationTiming(resource.resourceId, startedAt, status, progress);
		}
	}

	/** Derive the stable edition and generation identities from the Resource. */
	private createInstallationContext(resource: DecodedResourceContent): DictionaryInstallationContext {
		const { edition } = parseDictionaryResourceId(resource.resourceId);
		const source: DictionaryEditionSource = { publisher: resource.publisher, resourceId: resource.resourceId };
		return {
			edition,
			editionId: createDictionaryEditionId(source.publisher, edition),
			source,
			generation: createDictionaryChunkGeneration(resource.modifiedAt)
		};
	}

	/** Start a fresh collection of chunk boundaries and write counters. */
	private createInstallationProgress(): DictionaryInstallationProgress {
		return { ranges: [], chunks: 0, chunksWritten: 0, batchesCommitted: 0 };
	}

	/** Never overwrite an already accepted edition with an older Resource. */
	private async isOlderThanAcceptedEdition(resource: DecodedResourceContent, editionId: string): Promise<boolean> {
		const receipt = await this.transaction.run(stores => stores.resourceInstallations.get(
			DICTIONARY_EDITION_OBJECT_TYPE, editionId
		));
		return receipt !== undefined && receipt.modifiedAt > resource.modifiedAt;
	}

	/**
	 * Compress partitions one at a time and commit bounded batches. Record the
	 * same ordered chunk ranges used later by the definition locator.
	 */
	private async persistCompressedChunks(
		resource: DecodedResourceContent,
		bundle: DictionaryEditionBundle,
		context: DictionaryInstallationContext,
		progress: DictionaryInstallationProgress
	): Promise<void> {
		const pending: ChunkCandidate[] = [];
		for (const partition of partitionDictionaryIntoChunks(bundle, this.targetBytes)) {
			pending.push(await this.compressChunk(context, partition));
			progress.ranges.push({ chunkId: partition.chunkId, firstKey: partition.firstKey, lastKey: partition.lastKey });
			progress.chunks++;
			if (pending.length >= this.batchSize) {
				await this.commitChunkBatch(resource, pending, progress);
				await this.pause();
			}
		}
		if (pending.length > 0) {
			await this.commitChunkBatch(resource, pending, progress);
		}
	}

	/** Compress exactly one partition and wrap it in a Domain-object candidate. */
	private async compressChunk(context: DictionaryInstallationContext, partition: DictionaryChunkPartition): Promise<ChunkCandidate> {
		const gzip = await this.compress(partition.serializedJson);
		const objectId = createDictionaryChunkObjectId(context.source, context.generation, partition.ordinal);
		const chunk: DictionaryChunk = {
			id: objectId,
			source: context.source,
			generation: context.generation,
			chunkId: partition.chunkId,
			ordinal: partition.ordinal,
			firstKey: partition.firstKey,
			lastKey: partition.lastKey,
			uncompressedBytes: partition.uncompressedBytes,
			compressedBytes: gzip.byteLength,
			gzip
		};
		return {
			objectType: DICTIONARY_CHUNK_OBJECT_TYPE,
			objectId,
			dataType: DICTIONARY_CHUNK_DATA_TYPE,
			dataVersion: DICTIONARY_CHUNK_DATA_VERSION,
			value: chunk
		};
	}

	/** Persist one complete batch, count successful writes, and release its references. */
	private async commitChunkBatch(
		resource: DecodedResourceContent,
		pending: ChunkCandidate[],
		progress: DictionaryInstallationProgress
	): Promise<void> {
		progress.chunksWritten += await this.commit(resource, pending);
		progress.batchesCommitted++;
		pending.length = 0;
	}

	/**
	 * Commit the index, locator, and edition manifest atomically and last. This
	 * is the only point at which the new chunk generation becomes visible.
	 */
	private async publishCompletedEdition(
		resource: DecodedResourceContent,
		bundle: DictionaryEditionBundle,
		context: DictionaryInstallationContext,
		progress: DictionaryInstallationProgress,
		index: DictionaryHeadwordIndex
	): Promise<void> {
		const map = createDictionaryChunkMap(context.source, context.generation, progress.ranges);
		const manifest = this.createEditionManifest(resource, bundle, context, progress.chunks);
		await this.commit(resource, this.createCompletionCandidates(index, map, manifest), true);
		progress.batchesCommitted++;
	}

	/** Describe the installed chunk generation without embedding its definitions. */
	private createEditionManifest(
		resource: DecodedResourceContent,
		bundle: DictionaryEditionBundle,
		context: DictionaryInstallationContext,
		chunkCount: number
	): DictionaryEditionManifest {
		return {
			id: context.editionId,
			edition: context.edition,
			publisher: context.source.publisher,
			resourceId: context.source.resourceId,
			modifiedAt: resource.modifiedAt,
			entryCount: Object.keys(bundle.definitions).length,
			definitionFormat: bundle.definitionFormat,
			storageFormat: 'chunks-v1',
			chunkGeneration: context.generation,
			chunkCount
		};
	}

	/** Keep the three completion markers in one transaction and in one order. */
	private createCompletionCandidates(
		index: DictionaryHeadwordIndex,
		map: DictionaryChunkMap,
		manifest: DictionaryEditionManifest
	): ChunkCandidate[] {
		return [
			{
				objectType: DICTIONARY_HEADWORD_INDEX_OBJECT_TYPE, objectId: index.id,
				dataType: DICTIONARY_HEADWORD_INDEX_DATA_TYPE, dataVersion: DICTIONARY_HEADWORD_INDEX_DATA_VERSION, value: index
			},
			{
				objectType: DICTIONARY_CHUNK_MAP_OBJECT_TYPE, objectId: map.id,
				dataType: DICTIONARY_CHUNK_MAP_DATA_TYPE, dataVersion: DICTIONARY_CHUNK_DATA_VERSION, value: map
			},
			{
				objectType: DICTIONARY_EDITION_OBJECT_TYPE, objectId: manifest.id,
				dataType: DICTIONARY_EDITION_DATA_TYPE, dataVersion: DICTIONARY_DATA_VERSION, value: manifest
			}
		];
	}

	/** Emit a single completion, interruption, or older-revision timing report. */
	private reportInstallationTiming(
		resourceId: string,
		startedAt: number,
		status: DictionaryChunkInstallationTiming['status'],
		progress: DictionaryInstallationProgress
	): void {
		this.report({
			resourceId, status,
			chunks: progress.chunks,
			chunksWritten: progress.chunksWritten,
			batchesCommitted: progress.batchesCommitted,
			totalMs: Math.round(performance.now() - startedAt)
		});
	}

	/** Queue bounded receipt checks, then the necessary object and receipt writes. */
	private async commit(resource: DecodedResourceContent, candidates: readonly ChunkCandidate[], replaceEqual = false): Promise<number> {
		return this.transaction.run(async stores => {
			const receipts = await Promise.all(candidates.map(candidate =>
				stores.resourceInstallations.get(candidate.objectType, candidate.objectId)));
			const pending = candidates.filter((candidate, index) => {
				const previous = receipts[index];
				return !previous || resource.modifiedAt > previous.modifiedAt ||
					(replaceEqual && resource.modifiedAt === previous.modifiedAt);
			});
			const requests: Promise<void>[] = [];
			for (const candidate of pending) {
				requests.push(stores.domainObjects.put(this.toStoredObject(candidate)));
				requests.push(stores.resourceInstallations.put(this.toReceipt(resource, candidate)));
			}
			await Promise.all(requests);
			return pending.length;
		});
	}

	/** Convert a prepared chunk/marker to the existing IndexedDB Domain-object schema. */
	private toStoredObject(candidate: ChunkCandidate): StoredDomainObject {
		return { id: createStoredDomainObjectId(candidate.objectType, candidate.objectId), ...candidate };
	}

	/** Preserve Resource provenance and currentness without per-headword receipts. */
	private toReceipt(resource: DecodedResourceContent, candidate: ChunkCandidate): ResourceInstallation {
		return {
			id: createResourceInstallationId(candidate.objectType, candidate.objectId),
			objectType: candidate.objectType, objectId: candidate.objectId,
			publisher: resource.publisher, resourceId: resource.resourceId,
			...(resource.metadata === undefined ? {} : { metadata: resource.metadata }),
			modifiedAt: resource.modifiedAt
		};
	}
}
