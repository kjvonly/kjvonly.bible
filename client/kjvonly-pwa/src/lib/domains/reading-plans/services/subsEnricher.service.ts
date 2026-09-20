import type { Sub } from '../models/plans.model';

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
	getNextReadingIndex(completedReadingIndexes: readonly number[]): number {
		const completed = new Set(completedReadingIndexes);
		let nextReadingIndex = 0;

		while (completed.has(nextReadingIndex)) {
			nextReadingIndex += 1;
		}

		return nextReadingIndex;
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
			[...sub.completedReadingIndexes]
		);
	}

	hasNextReading(sub: Sub): boolean {
		return sub.nextReadingsIndex < sub.nestedReadings.length;
	}

	setPercentComplete(sub: Sub) {
		sub.percentCompleted = Math.ceil(
			(sub.completedReadingIndexes.size / sub.nestedReadings.length) * 100
		);
	}
}
