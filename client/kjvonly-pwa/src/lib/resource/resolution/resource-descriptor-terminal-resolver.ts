import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptorContentResolver
} from './resource-descriptor-content-resolver';


/**
 * Resolves one validated terminal Resource descriptor into verified content.
 *
 * Serialized byte retrieval remains delegated to ResourceDescriptorContentResolver.
 * This class only owns the terminal Resource-resolution step that combines those
 * bytes with trusted descriptor metadata to create VerifiedResourceContent.
 */
export class ResourceDescriptorTerminalResolver {
	constructor(
		private readonly descriptorContentResolver:
			Pick<
				ResourceDescriptorContentResolver,
				'resolve'
			>
	) {}

	/**
	 * Resolves serialized bytes and preserves the descriptor's Resource identity,
	 * revision, type, and media type in the terminal resolution result.
	 */
	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		VerifiedResourceContent
	> {
		const content =
			await this.descriptorContentResolver.resolve(
				descriptor
			);

		return {
			publisher:
				descriptor.metadata.publisher,

			resourceId:
				descriptor.metadata.resourceId,

			resourceType:
				descriptor.metadata.category,

			modifiedAt:
				descriptor.metadata.modifiedAt,

			mediaType:
				descriptor.metadata.mediaType,

			...(descriptor.metadata.dataType === undefined
				? {}
				: { dataType: descriptor.metadata.dataType }),

			...(descriptor.resourceMetadata === undefined
				? {}
				: { metadata: descriptor.resourceMetadata }),

			content
		};
	}
}
