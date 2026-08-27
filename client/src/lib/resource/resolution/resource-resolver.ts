import type {
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

export class ResourceResolver {
	constructor(
		private readonly resolvers:
			readonly ResourceRepresentationResolver[]
	) {}

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
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