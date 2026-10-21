import {
	isNormalizedReaderProfilingEnabled,
	logNormalizedReaderServiceDuration
} from '../runtime/normalized-content-reader-performance';

import type {
	ResourceDescriptor,
	ResourceDescriptorValidator
} from '$lib/resource';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	createNormalizedDocumentIdForDescriptor
} from '../models/normalized-document-id';

import type {
	NormalizedContentStore
} from '../persistence/normalized-content-store';

import {
	assertNormalizedDocumentDataContract
} from '../resources/normalized-content-resource-contract';

interface NormalizedContentResourceDescriptorLoader {
	loadDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<void>;
}

/**
 * Application-facing service for standalone documents owned by the Normalized
 * Content Domain.
 *
 * Local accepted state remains authoritative. Callers that already know the
 * Domain document id can read it directly through get(). When a known
 * ResourceDescriptor is available, getByDescriptor() checks local persistence
 * first and invokes the generic Resource installation lifecycle only on a miss.
 */
export class NormalizedContentService {

	constructor(
		private readonly store:
			Pick<
				NormalizedContentStore,
				'get'
			>,

		private readonly resourceLoader:
			NormalizedContentResourceDescriptorLoader,

		private readonly descriptorValidator:
			Pick<
				ResourceDescriptorValidator,
				'validate'
			>
	) {}

	/** Reads one already-accepted standalone document without Resource loading. */
	async get(
		documentId: string
	): Promise<
		NormalizedDocument |
		undefined
	> {
		return await this.store.get(
			documentId
		);
	}

	/**
	 * Returns one standalone normalized document represented by a known
	 * descriptor, installing it through the normal Resource lifecycle only when
	 * the accepted Domain object is not already local.
	 */
	async getByDescriptor(
		descriptor:
			unknown
	): Promise<NormalizedDocument> {
		const validatedDescriptor =
			this.descriptorValidator
				.validate(
					descriptor
				);

		const documentId =
			createNormalizedDocumentIdForDescriptor(
				validatedDescriptor
			);

		const profiling = isNormalizedReaderProfilingEnabled();
		const localReadStart = profiling ? performance.now() : 0;
		const existing =
			await this.get(
				documentId
			);
		if (profiling) {
			logNormalizedReaderServiceDuration(
				existing === undefined ? 'IndexedDB document lookup (miss)' : 'IndexedDB document lookup (hit)',
				localReadStart
			);
		}

		if (existing !== undefined) {
			return existing;
		}

		assertNormalizedDocumentDataContract(
			validatedDescriptor.metadata.dataType,
			validatedDescriptor.metadata.dataVersion
		);

		const installStart = profiling ? performance.now() : 0;
		await this.resourceLoader
			.loadDescriptor(
				validatedDescriptor
			);
		if (profiling) {
			logNormalizedReaderServiceDuration('Resource installation (network, decoding, Worker)', installStart);
		}

		const installedReadStart = profiling ? performance.now() : 0;
		const installed =
			await this.get(
				documentId
			);
		if (profiling) {
			logNormalizedReaderServiceDuration('IndexedDB document read after installation', installedReadStart);
		}

		if (installed === undefined) {
			throw new Error(
				`Normalized document was not installed: ${documentId}`
			);
		}

		return installed;
	}
}
