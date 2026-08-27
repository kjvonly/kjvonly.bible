import type {
	ResourceRepresentation,
	ResourceRepresentationType,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceRepresentationResolver {
	readonly representation:
		ResourceRepresentationType;

	resolve(
		resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	>;
}