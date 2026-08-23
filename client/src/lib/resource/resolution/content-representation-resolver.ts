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
		const content =
			new TextEncoder()
				.encode(
					resource.payload
				);

		return [
			{
				publisher:
					resource.publisher,

				resourceId:
					resource.resourceId,

				resourceType:
					resource.resourceType,

				eventId:
					resource.eventId,

				createdAt:
					resource.createdAt,

				mediaType:
					resource.mediaType,

				content
			}
		];
	}
}