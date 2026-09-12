import type {
	ResourcePublication
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
		ResourcePublication;

	readonly status:
		OutboxStatus;

	readonly attempts:
		number;
}

export function createPendingResourcePublication(
	id: string,
	resource:
		ResourcePublication
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
