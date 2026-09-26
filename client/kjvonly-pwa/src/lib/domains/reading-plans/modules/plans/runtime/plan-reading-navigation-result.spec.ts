import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	applyPlanReadingNavigationResult
} from './plan-reading-navigation-result';

describe(
	'applyPlanReadingNavigationResult',
	() => {
		it(
			'rejects a completion result for another subscription without changing progress',
			async () => {
				const completeReading =
					vi.fn(
						async () => ({
							id:
								'other-subscription',
							completedReadingIndexes: [
								2
							]
						})
					);

				const putProgress =
					vi.fn();

				await expect(
					applyPlanReadingNavigationResult(
						{
							type:
								'plans.reading-completed',
							subID:
								'other-subscription',
							subNestedReadingsIndex:
								2
						},
						'subscription-1',
						{
							planProgressService: {
								completeReading
							},
							plansPubSubService: {
								putProgress
							}
						}
					)
				).rejects.toThrow(
					'Invalid completed Plan reading navigation result'
				);

				expect(
					completeReading
				).not.toHaveBeenCalled();
				expect(
					putProgress
				).not.toHaveBeenCalled();
			}
		);
	}
);
