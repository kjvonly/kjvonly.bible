import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import {
	createPlanSubscriptionId
} from '$lib/domains/reading-plans/models/plan-subscription-id';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanProgressInstallationTransaction
} from './plan-progress-installation-stores';

import type {
	ValidatedPlanProgressCandidate
} from './validated-plan-progress-candidate';

export class PlanProgressInstaller {

	constructor(
		private readonly transaction:
			PlanProgressInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanProgressCandidate[]
	): Promise<void> {
		if (
			candidates.length !==
			1
		) {
			throw new Error(
				'Plan Progress Resource must contain exactly one Plan Progress.'
			);
		}

		const candidate =
			candidates[0];

		const progressId =
			createPlanSubscriptionId(
				resource.publisher,
				candidate.group,
				candidate.subscriptionId
			);

		await this.transaction.run(
			async (
				stores
			) => {
				const currentInstallation =
					await stores
						.resourceInstallations
						.get(
							PLAN_PROGRESS_OBJECT_TYPE,
							progressId
						);

				if (
					currentInstallation &&
					resource.modifiedAt <=
						currentInstallation.modifiedAt
				) {
					return;
				}

				const progress:
					PlanProgress = {
						id:
							progressId,

						completedReadingIndexes: [
							...candidate.progress.completedReadingIndexes
						]
					};

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								PLAN_PROGRESS_OBJECT_TYPE,
								progressId
							),

						objectType:
							PLAN_PROGRESS_OBJECT_TYPE,

						objectId:
							progressId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

				await stores
					.progress
					.put(
						progress
					);

				await stores
					.resourceInstallations
					.put(
						installation
					);
			}
		);
	}
}
