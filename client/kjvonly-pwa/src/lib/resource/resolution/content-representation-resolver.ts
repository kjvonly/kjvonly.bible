import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

/**
 * Resolves inline Resource content without interpreting or decoding its payload.
 */
export class ContentRepresentationResolver
	implements ResourceRepresentationResolver {

	readonly representation =
		'content' as const;

	/** Preserves Resource identity, type, revision, media type, and metadata. */
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

					...(resource.metadata === undefined
						? {}
						: { metadata: resource.metadata }),

					content:
						resource.payload
				}
			],

			current: [],
			failures: []
		};
	}
}