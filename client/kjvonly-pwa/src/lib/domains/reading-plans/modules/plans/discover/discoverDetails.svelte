<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// APPLICATION
	import {
		type NavigationComponentProps,
		useApplicationContext
	} from '$lib/application';
	import {
		attachEvents,
		BufferBody,
		BufferHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';

	// SVGS
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import type { PlanDefinitionView } from '../../../models/plans.model';
	import type { PlanSubscription } from '../../../models/plan-subscription';

	// SERVICES
	import {
		PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		createPlanSubscriptionIdForSource
	} from '../../../resources/subscriptions/plan-subscription-resource-source';

	// OTHER
	import uuid4 from 'uuid4';

	const {
		moduleResourceSelectionResolver,
		planSubscriptionsService,
		plansPubSubService,
		toastService
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let {
		paneID,
		clientHeight,
		obj,
		navService
	}: NavigationComponentProps = $props();

	const selectedPlan = obj.selectedPlan as PlanDefinitionView;

	// ================================== VARS =================================
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

		const threshold = 20;
		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			loadMoreReadings();
		}
	}

	// ============================== CLICK FUNCS ==============================
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

		navService.pop();
		navService.pop();
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={() => navService.pop()}>
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
	<div class="pt-2 pb-3 text-2xl text-support-b-700">{selectedPlan.name}</div>
	<div>{selectedPlan.description}</div>

	{#each Array(readingsToShow) as _, idx}
		<div class="flex w-full min-w-0 items-start px-4 py-3">
			<div class="w-28 shrink-0 self-stretch border-r border-neutral-300 pr-4 text-left whitespace-nowrap">
				<span>Reading {idx + 1}</span>
			</div>
			<div class="min-w-0 pl-4 text-left">
				<ReadingsComponent
					bind:readings={selectedPlan.nestedReadings[idx].bcvs}
				></ReadingsComponent>
			</div>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody
	ID={discoverDetailID}
	{clientHeight}
	{headerHeight}
	classes="overflow-x-hidden px-4"
>
	{@render body()}
</BufferBody>
