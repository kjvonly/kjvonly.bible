import type {
	ResolvedResourceRepresentation,
	ResourceRepresentationType
} from '$lib/resource/models/resource.model';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

export interface ResourceRepresentationResolver {
	readonly representation:
		ResourceRepresentationType;

	resolve(
		resource:
			ResolvedResourceRepresentation
	): Promise<
		ResourceResolutionResult
	>;
}
