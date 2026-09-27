import type {
	NavigationStateValue
} from '$lib/application';

import type {
	PlanProgress
} from '../../../models/plan-progress';
import {
	PLAN_NAVIGATION_RESULTS
} from '../../../models/plans.model';

interface PlanProgressCompletion {
	completeReading(
		subscriptionId: string,
		readingIndex: number
	): Promise<PlanProgress>;
}

interface PlansProgressProjection {
	putProgress(
		progress: PlanProgress
	): void;
}

/**
 * Applies a completed-reading result returned from a child navigation entry.
 *
 * Durable Plan progress is written before the worker projection is updated.
 * The caller can safely await this function before allowing navigation Back.
 */
export async function applyPlanReadingNavigationResult(
	result: NavigationStateValue,
	expectedSubscriptionId: string,
	context: {
		planProgressService: PlanProgressCompletion;
		plansPubSubService: PlansProgressProjection;
	}
): Promise<void> {
	if (
		!isRecord(result) ||
		result.type !==
			PLAN_NAVIGATION_RESULTS.READING_COMPLETED ||
		typeof result.subID !== 'string' ||
		result.subID !== expectedSubscriptionId ||
		typeof result.subNestedReadingsIndex !== 'number'
	) {
		throw new Error(
			'Invalid completed Plan reading navigation result'
		);
	}

	const progress =
		await context
			.planProgressService
			.completeReading(
				result.subID,
				result.subNestedReadingsIndex
			);

	context.plansPubSubService.putProgress(
		progress
	);
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
