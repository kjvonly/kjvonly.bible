import type {
	OutboxPublicationIntent
} from './outbox-publication-intent';

export type OutboxStatus =
	| 'pending'
	| 'publishing'
	| 'published'
	| 'failed';

export interface OutboxEntry {
	readonly id:
		string;

	readonly publication:
		OutboxPublicationIntent;

	readonly status:
		OutboxStatus;

	readonly attempts:
		number;
}

export function createPendingPublication(
	id: string,
	publication:
		OutboxPublicationIntent
): OutboxEntry {
	return {
		id,
		publication,
		status:
			'pending',
		attempts:
			0
	};
}
