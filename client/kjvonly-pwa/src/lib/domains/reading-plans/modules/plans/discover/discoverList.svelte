<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import {
		KJVAdaptiveHeaderTitle,
		KJVHeader
	} from '$lib/components';

	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	// =============================== BINDINGS ================================
	let {
		planList
	}: {
		planList: PlanDefinitionView[];
	} = $props();

	// ================================== VARS =================================
	let headerHeight: number = $state(0);

	// ============================== CLICK FUNCS ==============================
	function onPlanClicked(e: Event, plan: PlanDefinitionView) {
		e.stopPropagation();
		navigation.pushView(
			PLANS_VIEWS.PLANS_DETAILS,
			{
				planID: plan.id
			}
		);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle="Discover Plans"
		shortTitle="Discover"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Discover Plans"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: () => navigation.back()
		}}
		{titleContent}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{@render plansListView()}
{/snippet}

{#snippet plansListView()}
	<div class="{planList.length > 0 ? '' : 'hidden'} bg-neutral-50 pb-6">
		{#each planList as plan}
			<div class="py-2 hover:bg-neutral-100">
				<div
					tabindex="0"
					role="button"
					class="px-4 leading-loose"
					onclick={(e: Event) => {
						onPlanClicked(e, plan);
					}}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter') {
							onPlanClicked(e, plan);
						}
					}}
				>
					<div class="text-left whitespace-normal hover:cursor-pointer">
						<span class="text-support-b-700 py-2 text-left font-semibold"
							>{plan.name}</span
						>
						<span class="flex-fill flex"></span>
						<span class="min-h-[2.75rem] line-clamp-2 leading-snug">{plan.description}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody clientHeight={paneLayout.clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
