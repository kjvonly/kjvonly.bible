<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// APPLICATION
	import {
		Modules,
		type NavigationState,
		type NavigationViewState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import {
		attachEvents,
		BufferBody,
		BufferHeader
	} from '$lib/application/ui';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';

	// SVGS
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import {
		NullPlanDefinitionView,
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';
	import type { PlanSubscription } from '../../../models/plan-subscription';

	// SERVICES
	import {
		PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		createPlanSubscriptionIdForSource
	} from '../../../resources/subscriptions/plan-subscription-resource-source';

	// OTHER
	import uuid4 from 'uuid4';

	type DiscoverDetailsNavigationState =
		NavigationState<PLANS_VIEWS.PLANS_DETAILS> & {
			readonly state:
				NavigationViewState & {
					planID: string;
				};
		};

	const application =
		useApplicationContext();

	const {
		bibleBooknamesService,
		encodedReadingsDecoderService,
		moduleResourceSelectionResolver,
		planDefinitionsService,
		planSubscriptionsService,
		plansPubSubService,
		toastService
	} = application;

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	let {
		clientHeight,
		obj = $bindable()
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	const navigationState =
		obj.navigationState;

	validateNavState(
		navigationState
	);

	const planID =
		navigationState.state.planID;

	let selectedPlan: PlanDefinitionView =
		$state(NullPlanDefinitionView());

	// ================================== VARS =================================
	let headerHeight: number = $state(0);
	let readingsToShow: number = $state(0);
	let discoverDetailID = uuid4();

	// =============================== LIFECYCLE ===============================
	onMount(() => {
		void loadSelectedPlan();

		return attachEvents(
			`${discoverDetailID}-scroll-container`,
			'scroll',
			handleScroll
		);
	});

	// ================================ FUNCS ==================================

	/**
	 * Loads the selected Plan definition using the Resource selections captured
	 * by this navigation entry.
	 */
	async function loadSelectedPlan(): Promise<void> {
		const booknamesSource =
			moduleResourceSelectionResolver
				.requireWithNavigationState(
					navigationState,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

		const [booknames, definition] =
			await Promise.all([
				bibleBooknamesService.get(
					booknamesSource
				),
				planDefinitionsService.get(
					planID
				)
			]);

		if (!definition) {
			return;
		}

		selectedPlan = {
			...definition,
			nestedReadings:
				encodedReadingsDecoderService.parseEncodedReadings(
					[...definition.encodedReadings],
					(bookID: string) =>
						booknames.booknamesById[bookID] ?? ''
				)
		};

		loadMoreReadings();
	}

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
		await initializePlansRuntime(
			navigationState,
			application
		);

		const subscriptionSource =
			moduleResourceSelectionResolver
				.requireWithNavigationState(
					navigationState,
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

		navigation.back();
		navigation.back();
	}

	/**
	 * Validates the navigation contract required by Plan discovery details.
	 */
	function validateNavState(
		value: unknown
	): asserts value is DiscoverDetailsNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.PLANS_DETAILS ||
			!isRecord(value.state) ||
			typeof value.state.planID !== 'string' ||
			value.state.planID.length === 0
		) {
			throw new Error(
				'Invalid Plans discovery details navigation state'
			);
		}
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
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
