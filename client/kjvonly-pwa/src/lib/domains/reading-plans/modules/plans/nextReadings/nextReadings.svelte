<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// APPLICATION
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { ViewBody, ViewHeader } from '$lib/application/ui';

	import {
		BIBLE_VIEWS
	} from '$lib/domains/bible';

	// COMPONENTS
	import {
		KJVAdaptiveHeaderTitle,
		KJVHeader
	} from '$lib/components';
	import ReadingsComponent from '../components/readings.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';
	import {
		applyPlanReadingNavigationResult
	} from '../runtime/plan-reading-navigation-result';

	// MODELS
	import {
		PLANS_VIEWS,
		PLAN_NAVIGATION_RESULTS,
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
		planProgressService,
		plansPubSubService,
		subsEnricherService
	} = application;

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState,
		onResult
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	// ================================== VARS =================================

	let headerHeight: number = $state(0);
	const SUBSCRIBER_ID: string = uuid4();
	let mounted = true;
	let selectedSubscriptionID: string | undefined;

	let subsByID: Map<string, Sub> = new Map<string, Sub>();
	let nextReadings: NextReadings[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		const detachNavigationResult =
			onResult(
				onNavigationResult
			);

		void initialize();

		return detachNavigationResult;
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

	function onNextReadingSelected(
		nextReading: NextReadings
	): void {
		const firstReading =
			nextReading.readings.bcvs[0];

		if (!firstReading) {
			return;
		}

		selectedSubscriptionID =
			nextReading.subID;

		const navReadings = {
			readings: {
				bcvs: nextReading.readings.bcvs.map(
					(reading) => ({
						bookName: reading.bookName,
						bookID: reading.bookID,
						chapter: reading.chapter,
						verses: reading.verses,
						bibleLocationRef:
							reading.bibleLocationRef
					})
				)
			},
			currentNavReadingsIndex: 0
		};

		navigation.pushModule(
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{
				bibleLocationRef:
					firstReading.bibleLocationRef,
				navReadings,
				returnResult: {
					type:
						PLAN_NAVIGATION_RESULTS.READING_COMPLETED,
					subID:
						nextReading.subID,
					subNestedReadingsIndex:
						nextReading.subReadingsIndex
				}
			}
		);
	}

	async function onNavigationResult(
		result: unknown
	): Promise<void> {
		if (!selectedSubscriptionID) {
			throw new Error(
				'Next Readings result received without a selected subscription'
			);
		}

		await applyPlanReadingNavigationResult(
			result,
			selectedSubscriptionID,
			{
				planProgressService,
				plansPubSubService
			}
		);

		selectedSubscriptionID =
			undefined;
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
		onclick={() => onNextReadingSelected(n)}
		class="flex w-full flex-col px-2 py-4 text-base hover:bg-neutral-100"
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

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle="Next Readings"
		shortTitle="Next"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Next Readings"
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
	{#if nextReadings.length > 0}
		{#each nextReadings as n}
			{@render nextReading(n)}
		{/each}
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
