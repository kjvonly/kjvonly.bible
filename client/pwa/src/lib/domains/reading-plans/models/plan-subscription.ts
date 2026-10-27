/**
 * Durable user subscription to a Plan Definition.
 *
 * The Plan snapshot is copied into the subscription so the subscription
 * remains usable if the source Plan Definition later changes or disappears.
 */
export interface PlanSubscription {
	readonly id: string;
	readonly planDefinitionId: string;
	readonly name: string;
	readonly description: string;
	readonly encodedReadings: readonly string[];
	readonly dateSubscribed: number;
}
