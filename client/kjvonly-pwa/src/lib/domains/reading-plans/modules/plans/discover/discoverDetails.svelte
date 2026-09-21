<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	// COMPONENTS
	import {
		attachEvents,
		BufferBody,
		BufferContainer,
		BufferHeader
	} from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';
	import type { PlanSubscription } from '../../../models/plan-subscription';
	// SERVICES
	import uuid4 from 'uuid4';
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application';
	import {
		PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		createPlanSubscriptionIdForSource
	} from '../../../resources/subscriptions/plan-subscription-resource-source';
	// =============================== BINDINGS ================================
	const {
		moduleResourceSelectionResolver,
		planSubscriptionsService,
		plansPubSubService,
		toastService
	} = useApplicationContext();

	let {
		plansDisplay = $bindable<PLANS_VIEWS>(),
		selectedPlan = $bindable<PlanDefinitionView>(),
		paneID
	}: {
		plansDisplay: PLANS_VIEWS;

		selectedPlan: PlanDefinitionView;

		paneID: string;
	} = $props();
	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);
	let readingsToShow: number = $state(0);
	let discoverDetailID = uuid4();

	// =============================== LIFECYCLE ===============================
	onMount(() => {
		loadMoreReadings();

		return attachEvents(
			`${discoverDetailID}-scroll-container`,
			'scroll',
			handleScroll
		);
	});
	// ================================ FUNCS ==================================

	function loadMoreReadings() {
		let toShow = 0;
		let count = 0;
		const BATCH_SIZE_TO_SHOW = 30;

		while (
			toShow !== BATCH_SIZE_TO_SHOW &&
			count + readingsToShow < selectedPlan.nestedReadings.length
		) {
			toShow = toShow + 1;
			count++;
		}

		readingsToShow += count;
	}

	function handleScroll() {
		let el = document.getElementById(`${discoverDetailID}-scroll-container`);
		if (el === null) {
			return;
		}

		const threshold = 20; // Adjust this value as needed
		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			loadMoreReadings();
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onBackClicked() {
		plansDisplay = PLANS_VIEWS.PLANS_LIST;
	}

	async function onAddPlanClicked() {
		const subscriptionSource =
			moduleResourceSelectionResolver.require(
				paneID,
				PLAN_SUBSCRIPTION_RESOURCE_TYPE
			);

		const subscription: PlanSubscription = {
			id:
				createPlanSubscriptionIdForSource(
					subscriptionSource,
					uuid4()
				),
			planDefinitionId:
				selectedPlan.id,
			name:
				selectedPlan.name,
			description:
				selectedPlan.description,
			encodedReadings: [
				...selectedPlan.encodedReadings
			],
			dateSubscribed:
				Date.now()
		};

		await planSubscriptionsService.put(
			subscription
		);

		plansPubSubService.putSub(
			subscription
		);

		toastService.showToast(
			'Plan added to My Plans'
		);

		plansDisplay =
			PLANS_VIEWS.SUBS_LIST;
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={onBackClicked}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-cetner">Plan Details</span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onAddPlanClicked}>
			<AddCircle></AddCircle>
		</KJVButton>
	</span>
{/snippet}
<!-- ================================= BODY ================================ -->
{#snippet body()}
	<div class="pb-3 text-2xl">{selectedPlan?.name}</div>
	<div>{selectedPlan?.description}</div>

	{#each Array(readingsToShow) as _, idx}
		<div class="flex w-full min-w-50 p-4">
			<div class="flex flex-1 items-center">
				<span class="">Reading {idx + 1}</span>
			</div>
			<span class="flex"></span>
			<ReadingsComponent bind:readings={selectedPlan.nestedReadings[idx].bcvs}
			></ReadingsComponent>
		</div>
	{/each}
{/snippet}
<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody ID={discoverDetailID} bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
