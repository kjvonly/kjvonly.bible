import type {
	OutboxPublicationIntent
} from '$lib/application';

import type {
	ResourceRepresentationType
} from '$lib/resource/models/resource.model';

export interface ResourcePublication
	extends OutboxPublicationIntent {
	readonly type:
		'resource';

	readonly publisher:
		string;

	readonly resourceType:
		string;

	readonly resourceId:
		string;

	/**
	 * Resource revision timestamp assigned when a local Resource-backed write
	 * becomes durable. Transport publication reuses this value as its event
	 * timestamp instead of inventing a newer revision.
	 */
	readonly modifiedAt?:
		number;

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
export interface ResourceDeletionPublication
	extends OutboxPublicationIntent {
	readonly type:
		'resource';

	readonly operation:
		'delete';

	readonly publisher:
		string;

	readonly resourceType:
		string;

	readonly resourceId:
		string;

	readonly modifiedAt?:
		number;
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
