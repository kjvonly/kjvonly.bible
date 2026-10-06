import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	PlanDefinition
} from '../../models/plan-definition';

import {
	createPlanDefinitionId
} from '../../models/plan-definition-id';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '../../persistence/plan-definitions-store';

import type {
	PlanDefinitionResourceData
} from './plan-definition-data-type-handler';

import {
	PLAN_DEFINITION_DATA_TYPE,
	PLAN_DEFINITION_DATA_VERSION,
	PLAN_DEFINITION_RESOURCE_TYPE,
	parsePlanDefinitionResourceId
} from './plan-definition-resource';

/**
 * Gives a validated Plan Definition Resource its accepted Domain identity.
 *
 * Resource-path identity is intentionally interpreted here rather than by the
 * datatype validator so semantic payload validation remains reusable for
 * archive reconstruction.
 */
export class PlanDefinitionDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		PLAN_DEFINITION_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const {
			group,
			planKey
		} = parsePlanDefinitionResourceId(
			resource.resourceId
		);

		if (
			planKey === undefined
		) {
			throw new Error(
				`Invalid Plan Definition Resource ID: ${resource.resourceId}`
			);
		}

		const id =
			createPlanDefinitionId(
				resource.publisher,
				group,
				planKey
			);

		const accepted =
			value as PlanDefinitionResourceData;

		const definition:
			PlanDefinition = {
				id,

				name:
					accepted.name,

				description:
					accepted.description,

				encodedReadings: [
					...accepted.encodedReadings
				]
			};

		return [
			{
				objectType:
					PLAN_DEFINITION_OBJECT_TYPE,


				objectId:
					id,

				dataType:
					PLAN_DEFINITION_DATA_TYPE,

				dataVersion:
					PLAN_DEFINITION_DATA_VERSION,

				value:
					definition
			}
		];
	}
}
