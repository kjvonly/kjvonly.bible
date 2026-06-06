import { assert, describe, expect, it } from 'vitest';
import { subsEnricherService } from './subsEnricher.service';
import {
	type Sub,
	type CompletedReadings,
	NullSub,
	NullCompletedReadings,
	NullReadings
} from '$lib/models/plans.model';

describe('path util functions', () => {
	interface tt {
		completedReadings: number[];
		expectedResult: number;
	}

	let testTable: tt[] = [
		{
			completedReadings: [0, 1, 2],
			expectedResult: 3
		},
		{
			completedReadings: [2, 1, 0],
			expectedResult: 3
		},
		{
			completedReadings: [1, 0, 2],
			expectedResult: 3
		},
		{
			completedReadings: [0, 1, 3],
			expectedResult: 2
		}
	];

	for (const t of testTable) {
		it('returns next number in sequence', () => {
			let result = subsEnricherService.getNextReadingIndex(t.completedReadings);
			assert.equal(
				result,
				t.expectedResult,
				`should have returned ${t.expectedResult} but got ${result} instead.`
			);
		});
	}

	for (const t of testTable) {
		it('should set the next reading index', () => {
			let sub: Sub = NullSub();
			let completedReading = new Map<number, CompletedReadings>();
			for (const cr of t.completedReadings) {
				completedReading.set(cr, NullCompletedReadings());
			}
			sub.completedReadings = completedReading;
			subsEnricherService.setNextReadingIndex(sub);
			assert.equal(
				sub.nextReadingsIndex,
				t.expectedResult,
				`should have set nextReadingIndex to ${t.expectedResult} but got ${sub.nextReadingsIndex} instead.`
			);
		});
	}
});

describe('set percent complete', () => {
	it('should set percent complete', () => {
		interface tt {
			readingsCount: number;
			completedReadingsCount: number;
			expectedResult: number;
		}

		let testTable: tt[] = [
			{
				readingsCount: 100,
				completedReadingsCount: 10,
				expectedResult: 10
			},
			{
				readingsCount: 75,
				completedReadingsCount: 25,
				expectedResult: 34
			},
			{
				readingsCount: 100,
				completedReadingsCount: 0,
				expectedResult: 0
			},
			{
				readingsCount: 100,
				completedReadingsCount: 100,
				expectedResult: 100
			},
			{
				readingsCount: 1000,
				completedReadingsCount: 198,
				expectedResult: 20
			}
		];

		for (let t of testTable) {
			let sub = NullSub();

			for (let _ of Array(t.readingsCount)) {
				sub.nestedReadings.push(NullReadings());
			}

			let index = 0;
			for (let _ of Array(t.completedReadingsCount)) {
				sub.completedReadings.set(index, NullCompletedReadings());
				index += 1;
			}

			subsEnricherService.setPercentComplete(sub);
			assert.equal(
				sub.percentCompleted,
				t.expectedResult,
				`expected percent complete to equal ${t.expectedResult} but got ${sub.percentCompleted}`
			);
		}
	});
});
