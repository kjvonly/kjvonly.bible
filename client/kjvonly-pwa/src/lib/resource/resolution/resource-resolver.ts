import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

export class ResourceResolver {

	constructor(
		private readonly resolvers:
			readonly ResourceRepresentationResolver[]
	) {}

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {

		const resolver =
			this.resolvers.find(
				(candidate) =>
					candidate
						.representation ===
					resource
						.representation
			);

		if (!resolver) {
			throw new Error(
				`Unsupported Resource representation: ${resource.representation}`
			);
		}

		return resolver.resolve(
			resource
		);
	}
}