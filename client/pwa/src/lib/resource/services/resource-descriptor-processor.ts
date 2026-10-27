import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceDescriptorGraphResolver
} from '$lib/resource/resolution/resource-descriptor-graph-resolver';

import type {
	ResourceResolutionProcessor
} from './resource-resolution-processor';

import type {
	ResourceInstallResult
} from './resource-install-result';


/**
 * Processes one already-known ResourceDescriptor through the generic Resource
 * descriptor graph and installation lifecycle.
 *
 * This entry point performs no Resource discovery. The descriptor already
 * carries the target Resource identity and resolution strategy.
 */
export class ResourceDescriptorProcessor {
	constructor(
		private readonly graphResolver:
			Pick<
				ResourceDescriptorGraphResolver,
				'resolveDescriptor'
			>,

		private readonly resolutionProcessor:
			Pick<
				ResourceResolutionProcessor,
				'process'
			>
	) {}

	/**
	 * Resolves and processes one known descriptor without introducing a
	 * representation or discovery boundary.
	 */
	async process(
		descriptor:
			ResourceDescriptor
	): Promise<ResourceInstallResult> {
		const requested = {
			publisher:
				descriptor.metadata.publisher,

			resourceId:
				descriptor.metadata.resourceId
		};

		const resolution =
			await this.graphResolver.resolveDescriptor(
				descriptor
			);

		return this.resolutionProcessor.process(
			requested,
			resolution
		);
	}
}
