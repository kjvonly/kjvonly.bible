import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

export class ContentRepresentationResolver
	implements ResourceRepresentationResolver {

	readonly representation =
		'content' as const;

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		return {
			contents: [
				{
					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId,

					resourceType:
						resource.resourceType,

					modifiedAt:
						resource.modifiedAt,

					mediaType:
						resource.mediaType,

					content:
						resource.payload
				}
			],

			current: [],
			failures: []
		};
	}
}