import type {
	DecodedResourceContent,
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import type {
	ResourceInstallOutcome,
	ResourceInstallResult
} from './resource-install-result';

import type {
	ResourceResolutionProcessor
} from './resource-resolution-processor';


/**
 * Adapts Resource representations into the reusable post-resolution lifecycle.
 *
 * Representation resolution is delegated to ResourceResolver. Existing
 * ResourceResolutionResults and already-decoded Resource content are delegated
 * to ResourceResolutionProcessor.
 */
export class ResourceProcessor {
	constructor(
		private readonly resolver:
			Pick<
				ResourceResolver,
				'resolve'
			>,

		private readonly resolutionProcessor:
			Pick<
				ResourceResolutionProcessor,
				'process' |
				'processDecoded'
			>
	) {}

	/**
	 * Resolves one Resource representation and delegates the resulting Resource
	 * resolution outcome to the installation-side processor.
	 */
	async process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		const resolution =
			await this.resolver.resolve(
				representation
			);

		return this.resolutionProcessor.process(
			requested,
			resolution
		);
	}

	/**
	 * Preserves the existing decoded-content entry point while delegating its
	 * installation mechanics to ResourceResolutionProcessor.
	 */
	processDecoded(
		content:
			DecodedResourceContent
	): Promise<ResourceInstallOutcome> {
		return this.resolutionProcessor.processDecoded(
			content
		);
	}
}
