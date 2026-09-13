import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResolvedResourceRepresentation
} from '$lib/resource/models/resource.model';

export interface ResourceResolutionStrategy {
	readonly type:
		string;

	resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		ResolvedResourceRepresentation
	>;
}
