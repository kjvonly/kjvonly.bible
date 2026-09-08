import type {
	DecodedResourceContent,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceContentDecoratorBuilder
} from './resource-content-decorator-builder';

export class ResourceContentDecoder {
	constructor(
		private readonly decoratorBuilder:
			ResourceContentDecoratorBuilder
	) {}

	async decode(
		resource:
			VerifiedResourceContent
	): Promise<DecodedResourceContent> {
		const decorator =
			this.decoratorBuilder.build(
				resource.mediaType
			);

		const value =
			await decorator.decode(
				resource.content
			);

		return {
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

			value
		};
	}
}