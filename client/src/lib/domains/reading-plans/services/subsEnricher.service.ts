import type { Sub } from '$lib/models/plans.model';

/**
 * Subs enricher services enriches the a sub with metadata such as next readings
 * index (i.e. the next readings to read in the plan) and percent complete.
 */
export class SubsEnricherService {
	/**
	 *
	 * Given an array of completed reading indexes
	 * return the next reading to read. Note users
	 * could read out of order. Regardless of the
	 * latest reading return the lowest incomplete
	 * reading index.
	 *
	 * @param completedReadingIndexes completed reading indexes
	 * @returns lowest incomplete reading index
	 */
	getNextReadingIndex(completedReadings: number[]): number {
		return (
			completedReadings
				.sort((a, b) => a - b)
				.map((i, idx) => ({
					readingIndex: i,
					arrayIndex: idx
				}))
				.filter((i, idx) => i.readingIndex != idx)
				.at(0)?.arrayIndex || completedReadings.length
		);
	}

	/**
	 * Subscription have a next reading. The next reading is the lowest incomplete
	 * reading index in the plan. Readings are 0 indexed stored in an array of the plan.
	 * This function sets the next reading to the lowest incomplete reading index.
	 * @param sub subscription
	 *
	 */
	setNextReadingIndex(sub: Sub) {
		sub.nextReadingsIndex = this.getNextReadingIndex(
			sub.completedReadings.keys().toArray()
		);
	}

	setPercentComplete(sub: Sub) {
		sub.percentCompleted = Math.ceil(
			(sub.completedReadings.size / sub.nestedReadings.length) * 100
		);
	}
}

/**
 * enriches subs with metadata useful for end users such as next readings index
 * and percent complete.
 */
export const subsEnricherService = new SubsEnricherService();
