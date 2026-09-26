<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount, untrack } from 'svelte';

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

	import {
		BIBLE_VIEWS
	} from '$lib/domains/bible';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';
	import {
		applyPlanReadingNavigationResult
	} from '../runtime/plan-reading-navigation-result';

	// SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import CheckCircle from '$lib/components/svgs/checkCircle.svelte';
	import Pending from '$lib/components/svgs/pending.svelte';

	// MODELS
	import {
		NullSub,
		PLANS_VIEWS,
		PLAN_NAVIGATION_RESULTS,
		PLAN_PUBSUB_SUBSCRIPTIONS,
		type Sub
	} from '../../../models/plans.model';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';

	// OTHER
	import uuid4 from 'uuid4';

	type SubsDetailsNavigationState =
		NavigationState<PLANS_VIEWS.SUBS_DETAILS> & {
			readonly state:
				NavigationViewState & {
					subID: string;
				};
		};

	const application =
		useApplicationContext();

	const {
		planProgressService,
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

	const subID =
		navigationState.state.subID;

	let selectedSub: Sub = $state(NullSub());

	// ================================== VARS =================================

	let headerHeight = $state(0);

	let hasCompletedReading = $state(false);
	let showCompletedReadings: boolean = $state(false);
	let subListReadingsToShow: number = $state(0);
	let subListViewID = uuid4();
	let SUBSCRIBER_ID: string = uuid4();
	let mounted = true;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void initialize();

		const detachNavigationResult =
			navigation.onResult(
				navigationState,
				onNavigationResult
			);

		const detachScroll = attachEvents(
			`${subListViewID}-scroll-container`,
			'scroll',
			handleScroll
		);

		return () => {
			mounted = false;
			detachNavigationResult();
			detachScroll();
			plansPubSubService.unsubscribe(SUBSCRIBER_ID);
		};
	});

	$effect(() => {
		selectedSub;
		untrack(() => {
			loadMoreSubReadings();
			setHasCompletedReadings();
		});
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

	function onGetAllSubs(
		data: PlansSubscriptionsMessage
	): void {
		selectedSub =
			data.subs.get(subID) ??
			selectedSub;
	}

	function loadMoreSubReadings() {
		let toShow = 0;
		let count = 0;
		const BATCH_SIZE_TO_SHOW = 30;

		while (
			toShow !== BATCH_SIZE_TO_SHOW &&
			count + subListReadingsToShow < selectedSub.nestedReadings.length
		) {
			let hasCompletedReading = selectedSub.completedReadingIndexes.has(
				subListReadingsToShow + count
			);
			count++;
			if (hasCompletedReading && !showCompletedReadings) {
				continue;
			}
			toShow = toShow + 1;
		}

		subListReadingsToShow += count;
	}

	function handleScroll() {
		let el = document.getElementById(`${subListViewID}-scroll-container`);
		if (el === null) {
			return;
		}

		const threshold = 20;
		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			loadMoreSubReadings();
		}
	}

	function setHasCompletedReadings(): void {
		hasCompletedReading = selectedSub.completedReadingIndexes.size > 0;
	}

	function onSelectedSubReading(
		subNestedReadingsIndex: number
	): void {
		const readings =
			selectedSub.nestedReadings[
				subNestedReadingsIndex
			];

		const firstReading =
			readings?.bcvs[0];

		if (!readings || !firstReading) {
			return;
		}

		const navReadings = {
			readings: {
				bcvs: readings.bcvs.map(
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
						selectedSub.id,
					subNestedReadingsIndex
				}
			}
		);
	}

	/**
	 * Applies a completed Bible reading returned to this still-mounted view.
	 */
	async function onNavigationResult(
		result: unknown
	): Promise<void> {
		await applyPlanReadingNavigationResult(
			result,
			subID,
			{
				planProgressService,
				plansPubSubService
			}
		);
	}

	function onCloseSubDetails(): void {
		navigation.back();
	}

	function onToggleCompletedReadings(): void {
		showCompletedReadings = !showCompletedReadings;
		toastService.showToast('Toggled Completed Readings');
	}

	/**
	 * Validates the navigation contract required by subscription details.
	 */
	function validateNavState(
		value: unknown
	): asserts value is SubsDetailsNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.SUBS_DETAILS ||
			!isRecord(value.state) ||
			typeof value.state.subID !== 'string' ||
			value.state.subID.length === 0
		) {
			throw new Error(
				'Invalid Plans subscription details navigation state'
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
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="flex w-full">
			<KJVButton classes="" onClick={onCloseSubDetails}>
				<ArrowBack></ArrowBack>
			</KJVButton>
			<span class="flex-1"></span>
		</div>
		<span class="flex text-center">My plans</span>
		<div class="flex w-full">
			<span class="flex-1"></span>
			<KJVButton
				classes=""
				disabled={!hasCompletedReading}
				onClick={onToggleCompletedReadings}
			>
				{#if showCompletedReadings}
					<Pending></Pending>
				{:else}
					<CheckCircle></CheckCircle>
				{/if}
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{@render subListView(selectedSub)}
{/snippet}

{#snippet subListView(sub: Sub)}
	<span
		class="sticky top-0 border-t border-neutral-400 bg-neutral-50 p-2 text-2xl"
		>{sub.name}</span
	>

	{#each Array(subListReadingsToShow) as _, idx}
		{#if !sub.completedReadingIndexes.has(idx) || (sub.completedReadingIndexes.has(idx) && showCompletedReadings)}
			<button
				onclick={() => onSelectedSubReading(idx)}
				class="flex w-full flex-row px-2 py-4 text-base hover:cursor-pointer hover:bg-neutral-100"
			>
				<div class="flex w-full min-w-50">
					<ReadingsComponent bind:readings={sub.nestedReadings[idx].bcvs}
					></ReadingsComponent>
				</div>

				<div class="flex w-full min-w-50 flex-col">
					<div class="flex w-full">
						<span class="flex flex-grow"></span>
						<div
							class="text-lg {sub.completedReadingIndexes.has(idx)
								? 'text-support-a-500'
								: ''}"
						>
							{idx + 1} of {sub.nestedReadings.length}
						</div>
					</div>
					<div class="flex w-full justify-end">
						<div class="text-base text-nowrap">
							Verses: {sub.nestedReadings[idx].totalVerses}
						</div>
					</div>
				</div>
			</button>
		{/if}
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody ID={subListViewID} {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
