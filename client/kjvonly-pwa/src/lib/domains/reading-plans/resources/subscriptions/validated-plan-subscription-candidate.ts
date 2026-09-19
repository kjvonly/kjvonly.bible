export interface ValidatedPlanSubscriptionCandidate {
	readonly group: string;
	readonly subscriptionId: string;
	readonly subscription: {
		readonly planDefinitionId: string;
		readonly name: string;
		readonly description: string;
		readonly encodedReadings: readonly string[];
		readonly dateSubscribed: number;
	};
}
