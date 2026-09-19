<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	// COMPONENTS
	import { BufferBody, BufferContainer, BufferHeader } from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '$lib/domains/reading-plans/models/plans.model';

	// SERVICES
	// =============================== BINDINGS ================================
	let {
		planList = $bindable(),
		plansDisplay = $bindable(),
		selectedPlan = $bindable<PlanDefinitionView | undefined>(),
		paneID
	}: {
		planList: PlanDefinitionView[];
		plansDisplay: PLANS_VIEWS;
		selectedPlan: PlanDefinitionView | undefined;
		paneID: string;
	} = $props();
	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);
	// =============================== LIFECYCLE ===============================
	// ================================ FUNCS ==================================
	// ============================== CLICK FUNCS ==============================
	function onBackClicked() {
		plansDisplay = PLANS_VIEWS.SUBS_LIST;
	}

	function onPlanClicked(e: Event, plan: PlanDefinitionView) {
		selectedPlan = plan;
		plansDisplay = PLANS_VIEWS.PLANS_DETAILS;
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={onBackClicked}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-cetner">Discover Plans</span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={() => {}}>
			<AddCircle></AddCircle>
		</KJVButton>
	</span>
{/snippet}
<!-- ================================= BODY ================================ -->
{#snippet body()}
	{@render plansListView()}
{/snippet}

{#snippet plansListView()}
	{#each planList as plan}
		<button
			onclick={(e: Event) => {
				onPlanClicked(e, plan);
			}}
			class="col-2 flex w-full flex-col p-2 text-base hover:bg-neutral-100"
		>
			<div class="flex w-full">
				<span class="pb-2 text-2xl">{plan.name}</span>
			</div>

			<div class="text-md text-start">
				<p class="line-clamp-3 text-start">{plan.description}</p>
			</div>
		</button>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
