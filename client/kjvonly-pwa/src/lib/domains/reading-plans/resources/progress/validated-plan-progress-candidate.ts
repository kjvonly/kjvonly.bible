export interface ValidatedPlanProgressCandidate {
	readonly group: string;
	readonly subscriptionId: string;

	readonly progress: {
		readonly completedReadingIndexes:
			readonly number[];
	};
}
