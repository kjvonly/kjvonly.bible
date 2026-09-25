<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// APPLICATION
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import { BufferBody, BufferHeader } from '$lib/application/ui';

	// COMPONENTS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';

	// MODELS
	import {
		PLANS_VIEWS,
		PLAN_PUBSUB_SUBSCRIPTIONS,
		type Sub,
		type NextReadings
	} from '../../../models/plans.model';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';

	// OTHER
	import uuid4 from 'uuid4';

	const application =
		useApplicationContext();

	const {
		plansPubSubService,
		subsEnricherService
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

	// ================================== VARS =================================

	let headerHeight: number = $state(0);
	const SUBSCRIBER_ID: string = uuid4();
	let mounted = true;

	let subsByID: Map<string, Sub> = new Map<string, Sub>();
	let nextReadings: NextReadings[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void initialize();
	});

	onDestroy(() => {
		mounted = false;
		plansPubSubService.unsubscribe(SUBSCRIBER_ID);
	});

	// ================================ FUNCS ==================================

	async function initialize(): Promise<void> {
		await initializePlansRuntime(
			navigationState,
			application
		);

		if (!mounted) {
			return;
		}

		plansPubSubService.subscribe(
			PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
			onGetAllSubs,
			SUBSCRIBER_ID
		);
		plansPubSubService.getAllSubs();
	}

	/**
	 * Subscription func for getAllSubs. Anytime a subscription is changed and
	 * published this function is called with the updated subscription data.
	 */
	function onGetAllSubs(
		data: PlansSubscriptionsMessage
	): void {
		subsByID = data.subs;
		updateNextReadings();
	}

	function updateNextReadings() {
		let nrs: NextReadings[] = subsByID
			.entries()
			.filter(([_, s]) => filterSubsForNextReadings(s))
			.map(([_, s]) => subToNextReadings(s))
			.toArray();

		nextReadings.length = 0;
		nextReadings.push(...nrs);
	}

	/**
	 * Skip completed subscriptions.
	 */
	function filterSubsForNextReadings(s: Sub): boolean {
		return subsEnricherService.hasNextReading(s);
	}

	function subToNextReadings(s: Sub): NextReadings {
		return {
			readings: s.nestedReadings[s.nextReadingsIndex],
			dateSubscribed: s.dateSubscribed ? s.dateSubscribed : Date.now(),
			name: s.name,
			percentCompleted: s.percentCompleted,
			subReadingsIndex: s.nextReadingsIndex,
			totalReadings: s.nestedReadings.length,
			subID: s.id
		};
	}

	/**
	 * Validates the navigation contract required by the next-readings view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is NavigationState<PLANS_VIEWS.NEXT_LIST> {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.NEXT_LIST ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Plans next-readings navigation state'
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

{#snippet nextReading(n: NextReadings)}
	<button
		disabled
		class="flex w-full flex-col px-2 py-4 text-base"
	>
		<div class="flex">
			<span class="pb-2 text-2xl">{n.name}</span>
			<span class="flex-grow"></span>
			<span class="text-support-a-500">{n.percentCompleted}%</span>
		</div>
		<div class="flex flex-row">
			<div class="min-w-50">
				<ReadingsComponent bind:readings={n.readings.bcvs}></ReadingsComponent>
			</div>

			<div class="flex w-full min-w-50 flex-col">
				<div class="flex w-full">
					<span class="flex flex-grow"></span>
					<div class="text-lg">
						{n.subReadingsIndex + 1} of {n.totalReadings}
					</div>
				</div>
				<div class="flex w-full justify-end">
					<div class="text-base text-nowrap">
						Verses: {n.readings.totalVerses}
					</div>
				</div>
			</div>
		</div>
	</button>
{/snippet}

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={() => navigation.back()}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>
	<span class="text-center">Next Readings</span>

	<span class="flex-1"></span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#if nextReadings.length > 0}
		{#each nextReadings as n}
			{@render nextReading(n)}
		{/each}
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
