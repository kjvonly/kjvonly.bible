import type {
	PlanSubscription
} from '../../models/plan-subscription';

import {
	createPlanSubscriptionId
} from '../../models/plan-subscription-id';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '../../persistence/plan-subscriptions-store';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanSubscriptionInstallationTransaction
} from './plan-subscription-installation-stores';

import type {
	ValidatedPlanSubscriptionCandidate
} from './validated-plan-subscription-candidate';

export class PlanSubscriptionInstaller {

	constructor(
		private readonly transaction:
			PlanSubscriptionInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanSubscriptionCandidate[]
	): Promise<void> {
		if (
			candidates.length !==
			1
		) {
			throw new Error(
				'Plan Subscription Resource must contain exactly one Plan Subscription.'
			);
		}

		const candidate =
			candidates[0];

		const subscriptionId =
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
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
							subscriptionId
						);

				if (
					currentInstallation &&
					resource.modifiedAt <=
						currentInstallation.modifiedAt
				) {
					return;
				}

				const subscription:
					PlanSubscription = {
						id:
							subscriptionId,

						...candidate.subscription
					};

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								PLAN_SUBSCRIPTION_OBJECT_TYPE,
								subscriptionId
							),

						objectType:
							PLAN_SUBSCRIPTION_OBJECT_TYPE,

						objectId:
							subscriptionId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

				await stores
					.subscriptions
					.put(
						subscription
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
