import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './definitions/plan-definition-interpreter';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './subscriptions/plan-subscription-resource-source';

import {
	PlansModuleResourceSelectionContributor
} from './plans-module-resource-selection-contributor';

describe(
	'PlansModuleResourceSelectionContributor',
	() => {
		it(
			'owns the Plans module Resource requirements',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {},
						currentSelections: {
							[BIBLE_BOOKNAMES_RESOURCE_TYPE]:
								createReference(
									'booknames',
									`${BIBLE_BOOKNAMES_RESOURCE_TYPE}/default`
								),
							[PLAN_DEFINITION_RESOURCE_TYPE]:
								createReference(
									'plans-publisher',
									`${PLAN_DEFINITION_RESOURCE_TYPE}/study`
								),
							[PLAN_SUBSCRIPTION_RESOURCE_TYPE]:
								createReference(
									'subscriptions-publisher',
									`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default`
								),
							[BIBLE_CHAPTER_RESOURCE_TYPE]:
								createReference(
									'chapters',
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`
								)
						}
					});

				expect(
					Object.keys(selections)
				).toEqual([
					BIBLE_BOOKNAMES_RESOURCE_TYPE,
					PLAN_DEFINITION_RESOURCE_TYPE,
					PLAN_SUBSCRIPTION_RESOURCE_TYPE
				]);
			}
		);

		it(
			'derives the default Plan Definition selection from the current user',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {},
						currentSelections: {}
					});

				expect(
					selections[
						PLAN_DEFINITION_RESOURCE_TYPE
					]
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`${PLAN_DEFINITION_RESOURCE_TYPE}/default`
				});
			}
		);

		it(
			'derives the default Plan Subscription selection from the current user',
			() => {
				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {},
						currentSelections: {}
					});

				expect(
					selections[
						PLAN_SUBSCRIPTION_RESOURCE_TYPE
					]
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default`
				});
			}
		);

		it(
			'preserves an existing Plan Definition selection',
			() => {
				const selectedPlans =
					createReference(
						'other-publisher',
						`${PLAN_DEFINITION_RESOURCE_TYPE}/study`
					);

				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {
							[PLAN_DEFINITION_RESOURCE_TYPE]:
								selectedPlans
						},
						currentSelections: {}
					});

				expect(
					selections[
						PLAN_DEFINITION_RESOURCE_TYPE
					]
				).toEqual(
					selectedPlans
				);
			}
		);

		it(
			'preserves an existing Plan Subscription selection',
			() => {
				const selectedSubscriptions =
					createReference(
						'other-publisher',
						`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/study`
					);

				const selections =
					createContributor(
						'user-pubkey'
					).build({
						originatingSelections: {
							[PLAN_SUBSCRIPTION_RESOURCE_TYPE]:
								selectedSubscriptions
						},
						currentSelections: {}
					});

				expect(
					selections[
						PLAN_SUBSCRIPTION_RESOURCE_TYPE
					]
				).toEqual(
					selectedSubscriptions
				);
			}
		);

		it(
			'leaves Plan Definition selection missing when no current user is available',
			() => {
				const selections =
					createContributor().build({
						originatingSelections: {},
						currentSelections: {}
					});

				expect(
					selections[
						PLAN_DEFINITION_RESOURCE_TYPE
					]
				).toBeUndefined();

				expect(
					selections[
						PLAN_SUBSCRIPTION_RESOURCE_TYPE
					]
				).toBeUndefined();
			}
		);
	}
);

function createContributor(
	pubkey?: string
): PlansModuleResourceSelectionContributor {
	return new PlansModuleResourceSelectionContributor(
		{
			tryGetPubkey() {
				return pubkey;
			}
		}
	);
}

function createReference(
	publisher: string,
	resourceId: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId
	};
}
