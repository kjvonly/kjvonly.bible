import type {
	DecodedResourceContent,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceContentCodecBuilder
} from './resource-content-codec-builder';

export class ResourceContentDecoder {
	constructor(
		private readonly codecBuilder:
			ResourceContentCodecBuilder
	) {}

	async decode(
		resource:
			VerifiedResourceContent
	): Promise<
		DecodedResourceContent
	> {
		const codec =
			this.codecBuilder.build(
				resource.mediaType
			);

		const value =
			await codec.decode(
				resource.content
			);

		return {
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

			value
		};
	}
}