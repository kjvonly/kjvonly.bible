/**
 * Base contract for a durable application publication queued in the Outbox.
 *
 * The publication owns its runtime type. Outbox infrastructure uses that type
 * only to resolve the registered publication strategy; it does not know the
 * publication's domain-specific shape.
 */
export interface OutboxPublicationIntent {
	readonly type:
		string;

	readonly [key: string]:
		unknown;
}
