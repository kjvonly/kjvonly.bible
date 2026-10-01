<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// APPLICATION
	import {
		useApplicationContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVAdaptiveHeaderTitle,
		KJVCard,
		KJVHeader,
		KJVIconButton
	} from '$lib/components';
	import Add from '$lib/components/svgs/add.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';
	import {
		parsePlanDefinitionId
	} from '../../../models/plan-definition-id';

	const {
		petNameService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	// =============================== BINDINGS ================================
	let {
		planList,
		onAddPlan
	}: {
		planList: PlanDefinitionView[];
		onAddPlan: (plan: PlanDefinitionView) => void | Promise<void>;
	} = $props();

	// ================================== VARS =================================
	let headerHeight: number = $state(0);

	// ============================== CLICK FUNCS ==============================
	function onPlanClicked(plan: PlanDefinitionView): void {
		navigation.pushView(
			PLANS_VIEWS.PLANS_DETAILS,
			{
				planID: plan.id
			}
		);
	}

	function onAddClicked(plan: PlanDefinitionView): void {
		void onAddPlan(plan);
	}

	// ================================ DISPLAY ================================
	function publisherLabel(plan: PlanDefinitionView): string {
		const {
			publisher
		} = parsePlanDefinitionId(
			plan.id
		);

		return petNameService.resolve(
			publisher
		);
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle="Discover Plans"
		shortTitle="Discover"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Discover Plans"
		{leadingContent}
		{titleContent}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	<div class="flex w-full flex-col gap-4 py-4">
		{#each planList as plan}
			<KJVCard
				onClick={() => onPlanClicked(plan)}
				label={`Preview ${plan.name} plan`}
			>
				{#snippet header()}
					<div class="min-w-0">
						<div class="truncate text-base font-semibold text-neutral-700">
							{plan.name}
						</div>
						<div
							class="truncate text-sm text-neutral-500"
							title={parsePlanDefinitionId(plan.id).publisher}
						>
							Published by {publisherLabel(plan)}
						</div>
					</div>
				{/snippet}

				{#snippet body()}
					{#if plan.description}
						<p class="line-clamp-2 text-sm text-neutral-600">
							{plan.description}
						</p>
					{/if}
				{/snippet}

				{#snippet actions()}
					<div class="min-w-0 flex-1 text-sm text-neutral-500">
						{plan.nestedReadings.length}
						{plan.nestedReadings.length === 1 ? 'reading' : 'readings'}
					</div>

					<KJVIconButton
						label={`Add ${plan.name} plan`}
						variant="quiet"
						onClick={() => onAddClicked(plan)}
					>
						<Add classes="h-[1.25em] w-[1.25em] text-primary-500" />
					</KJVIconButton>
				{/snippet}
			</KJVCard>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody clientHeight={paneLayout.clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
