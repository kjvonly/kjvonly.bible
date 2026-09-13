/**
 * Durable progress for one accepted Plan Subscription.
 *
 * id is the Plan Subscription application id:
 * <publisher>/<group>/<subscriptionId>.
 *
 * Progress is intentionally stored separately from the subscription snapshot.
 * The completed reading indexes refer to the subscription's encoded/nested
 * readings by zero-based index.
 */
export interface PlanProgress {
	readonly id: string;
	readonly completedReadingIndexes:
		readonly number[];
}
