import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type {
	ResourceService
} from '$lib/resource/services/resource.service';

import type {
	ResourceReferenceBuilder
} from './resource-reference-builder';

/**
 * Loads Resources through the generic Resource installation lifecycle.
 *
 * Reference-based loading performs discovery through the injected installer.
 * Descriptor-based loading skips discovery because the ResourceDescriptor
 * already identifies and describes the Resource to resolve.
 */
export class ResourceLoader<TKey> {

	constructor(
		private readonly resources:
			Pick<
				ResourceService,
				'install' |
				'installDescriptor'
			>,

		private readonly references:
			ResourceReferenceBuilder<TKey>
	) {}

	async load(
		source:
			PublishedResourceReference,
		key:
			TKey
	): Promise<boolean> {
		const individual =
			this.references.individual(
				source,
				key
			);

		if (
			individual !== null
		) {
			const result =
				await this.resources.install(
					individual
				);

			if (
				result.found
			) {
				this.assertSuccessful(
					result
				);

				return true;
			}
		}

		const bundle =
			this.references.bundle(
				source
			);

		const result =
			await this.resources.install(
				bundle
			);

		if (
			!result.found
		) {
			return false;
		}

		this.assertSuccessful(
			result
		);

		return true;
	}

	/**
	 * Loads one already-known ResourceDescriptor and waits for its generic
	 * Resource installation lifecycle to complete.
	 *
	 * The installed Domain object is intentionally not returned. The owning
	 * Domain remains responsible for reading its own cache or persistence after
	 * this method completes.
	 */
	async loadDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<void> {
		const result =
			await this.resources.installDescriptor(
				descriptor
			);

		this.assertSuccessful(
			result
		);
	}

	private assertSuccessful(
		result:
			ResourceInstallResult
	): void {
		for (
			const outcome of result.resources
		) {
			if (
				outcome.status ===
					'handled' ||
				outcome.status ===
					'current'
			) {
				continue;
			}

			if (
				outcome.status ===
					'failed'
			) {
				throw outcome.error;
			}

			throw new Error(
				`Unsupported Resource Type: ${outcome.resourceType}`
			);
		}
	}
}
