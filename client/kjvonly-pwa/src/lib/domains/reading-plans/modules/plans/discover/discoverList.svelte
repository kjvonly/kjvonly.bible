<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import { useNavigationRuntimeContext } from '$lib/application';
	import {
		BufferBody,
		BufferHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	let {
		clientHeight,
		planList
	}: {
		clientHeight: number;
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
{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={() => navigation.back()}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-cetner">Discover Plans</span>
	<span class="flex-1"></span>
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
<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
