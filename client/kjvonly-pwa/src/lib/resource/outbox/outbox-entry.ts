import type {
	ResourcePublicationIntent
} from '$lib/resource/publication/resource-publication';

export type OutboxStatus =
	| 'pending'
	| 'publishing'
	| 'published'
	| 'failed';

export interface OutboxEntry {
	readonly id:
		string;

	readonly resource:
		ResourcePublicationIntent;

	readonly status:
		OutboxStatus;

	readonly attempts:
		number;
}

export function createPendingResourcePublication(
	id: string,
	resource:
		ResourcePublicationIntent
): OutboxEntry {
	return {
		id,
		resource,
		status:
			'pending',
		attempts:
			0
	};
}
