import type {
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

export class ContentRepresentationResolver
	implements ResourceRepresentationResolver {

	readonly representation =
		'content' as const;

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	> {
		return [
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
		];
	}
}