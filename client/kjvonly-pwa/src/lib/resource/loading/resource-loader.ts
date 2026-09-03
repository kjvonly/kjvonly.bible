import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceService
} from '$lib/resource/services/resource.service';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type {
	ResourceReferenceBuilder
} from './resource-reference-builder';

export class ResourceLoader<TKey> {

	constructor(
		private readonly resources:
			Pick<
				ResourceService,
				'install'
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

	private assertSuccessful(
		result:
			ResourceInstallResult
	): void {
		for (
			const outcome of result.resources
		) {
			if (
				outcome.status ===
				'handled'
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