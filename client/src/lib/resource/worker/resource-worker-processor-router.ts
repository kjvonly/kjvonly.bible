import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

interface ResourceWorkerProcessor {
	process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult>;
}

export class ResourceWorkerProcessorRouter {

	constructor(
		private readonly content:
			ResourceWorkerProcessor,

		private readonly descriptors:
			ResourceWorkerProcessor
	) {}

	process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		if (
			representation.representation ===
				'content'
		) {
			return this.content.process(
				requested,
				representation
			);
		}

		return this.descriptors.process(
			requested,
			representation
		);
	}
}
