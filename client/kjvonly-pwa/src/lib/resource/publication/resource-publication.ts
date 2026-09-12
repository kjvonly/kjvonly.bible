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

/**
 * Explicit outbound deletion intent for a Resource.
 *
 * A Domain must deliberately create this intent. A local delete does not
 * automatically imply external Resource deletion.
 */
export interface ResourceDeletionPublication {
	readonly operation:
		'delete';

	readonly publisher:
		string;

	readonly resourceType:
		string;

	readonly resourceId:
		string;
}

export type ResourcePublicationIntent =
	| ResourcePublication
	| ResourceDeletionPublication;

export function isResourceDeletionPublication(
	resource:
		ResourcePublicationIntent
): resource is ResourceDeletionPublication {
	return (
		'operation' in resource &&
		resource.operation === 'delete'
	);
}
