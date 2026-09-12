import type {
	ResourceRepresentationType
} from '$lib/resource/models/resource.model';

export interface ResourcePublication {
	readonly publisher:
		string;

	readonly resourceType:
		string;

	readonly resourceId:
		string;

	readonly representation:
		ResourceRepresentationType;

	readonly mediaType:
		string;

	readonly value:
		unknown;
}
