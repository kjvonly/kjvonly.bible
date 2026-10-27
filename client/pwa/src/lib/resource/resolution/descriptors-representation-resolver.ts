import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

import type {
	ResourceDescriptorGraphResolver
} from './resource-descriptor-graph-resolver';


/**
 * Resolves a `descriptors` Resource representation through descriptor-graph
 * resolution.
 *
 * This class is the representation-level facade. It decodes the containing
 * descriptor document, associates document-level failures with that Resource,
 * and delegates descriptor traversal to ResourceDescriptorGraphResolver.
 */
export class DescriptorsRepresentationResolver
	implements ResourceRepresentationResolver {

	readonly representation =
		'descriptors' as const;

	constructor(
		private readonly documentDecoder:
			Pick<
				ResourceDescriptorDocumentDecoder,
				'decode'
			>,

		private readonly descriptorGraphResolver:
			Pick<
				ResourceDescriptorGraphResolver,
				'resolve'
			>
	) {}

	/**
	 * Decodes the containing descriptor document and delegates its graph.
	 */
	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		let entries:
			readonly unknown[];

		try {
			entries =
				await this.documentDecoder.decode(
					resource.mediaType,
					resource.payload
				);
		} catch (error) {
			return {
				contents:
					[],

				current:
					[],

				failures: [
					{
						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						resourceType:
							resource.resourceType,

						error
					}
				]
			};
		}

		return this.descriptorGraphResolver.resolve(
			entries,
			{
				publisher:
					resource.publisher,

				resourceId:
					resource.resourceId
			}
		);
	}
}
