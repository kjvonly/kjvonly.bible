import type {
	OutboxPublicationIntent
} from './outbox-publication-intent';

/**
 * Publishes one Outbox publication type.
 *
 * Implementations are registered with OutboxProcessor by publication type in
 * the application composition root. Adding a new publication type therefore
 * does not require changing OutboxProcessor.
 */
export interface OutboxPublicationStrategy {
	readonly type:
		string;

	publish(
		publication:
			OutboxPublicationIntent
	): Promise<void>;
}
