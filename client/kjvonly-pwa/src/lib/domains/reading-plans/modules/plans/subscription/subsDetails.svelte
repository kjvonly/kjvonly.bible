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
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// BIBLE
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE,
		BIBLE_VIEWS,
		type BibleChapterVerseCountLookup
	} from '$lib/domains/bible';

	// COMPONENTS
	import {
		KJVAsyncState,
		KJVHeader,
		KJVScrubbedViewport
	} from '$lib/components';
	import PlanReadingsList from '../components/planReadingsList.svelte';
	import PlansLoadState from '../components/plansLoadState.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';
	import {
		applyPlanReadingNavigationResult
	} from '../runtime/plan-reading-navigation-result';

	// MODELS
	import {
		NullSub,
		PLANS_VIEWS,
		PLAN_NAVIGATION_RESULTS,
		PLAN_PUBSUB_SUBSCRIPTIONS,
		type Sub
	} from '../../../models/plans.model';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';
	import type { PlansViewLoadState } from '../runtime/plans-view-load-state';

	// OTHER
	import uuid4 from 'uuid4';

	const BATCH_SIZE_TO_SHOW = 30;

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
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		petNameService,
		planProgressService,
		plansPubSubService,
		toastService
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

	const subID =
		navigationState.state.subID;

	let selectedSub: Sub = $state(NullSub());

	// ================================== VARS =================================

	let headerHeight = $state(0);
	let hasCompletedReading = $state(false);
	let showCompletedReadings = $state(false);
	let visibleReadingEndExclusive = $state(0);
	let scrubberReadingNumber = $state(1);
	let verseCountByBookChapter =
		$state<BibleChapterVerseCountLookup>({});
	let shortBookNamesById =
		$state<Readonly<Record<string, string>>>({});
	let subListViewID = uuid4();
	let SUBSCRIBER_ID: string = uuid4();
	let mounted = true;
	let loadState = $state<PlansViewLoadState>('initializing');
	let subscriptionMissing = $state(false);


	let firstVisibleReadingIndex = $derived(
		showCompletedReadings
			? 0
			: Math.min(
				selectedSub.nextReadingsIndex,
				selectedSub.nestedReadings.length
			)
	);

	let visibleReadingIndexes = $derived.by(() => {
		const indexes: number[] = [];

		for (
			let index = firstVisibleReadingIndex;
			index < visibleReadingEndExclusive;
			index++
		) {
			if (
				!showCompletedReadings &&
				selectedSub.completedReadingIndexes.has(index)
			) {
				continue;
			}

			indexes.push(index);
		}

		return indexes;
	});

	let scrubberMinReadingNumber = $derived(
		showCompletedReadings
			? 1
			: Math.min(
				selectedSub.nextReadingsIndex + 1,
				Math.max(1, selectedSub.nestedReadings.length)
			)
	);

	let showScrubber = $derived(
		selectedSub.nestedReadings.length > 1 &&
		(
			showCompletedReadings ||
			selectedSub.nextReadingsIndex <
				selectedSub.nestedReadings.length
		)
	);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void initialize();

		const detachNavigationResult =
			onResult(
				onNavigationResult
			);

		return () => {
			mounted = false;
			detachNavigationResult();
			plansPubSubService.unsubscribe(SUBSCRIBER_ID);
		};
	});


	// ================================ FUNCS ==================================

	async function initialize(): Promise<void> {
		subscriptionMissing = false;
		loadState = 'initializing';
		plansPubSubService.unsubscribe(SUBSCRIBER_ID);

		try {
			await initializePlansRuntime(
				navigationState,
				application
			);

			if (!mounted) {
				return;
			}

			loadState = 'loading';

			const booknamesSource =
				moduleResourceSelectionResolver.require(
					navigationState,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

			const booknames =
				await bibleBooknamesService.get(
					booknamesSource
				);

			if (!mounted) {
				return;
			}

			verseCountByBookChapter =
				booknames.bookchapterversecountById;
			shortBookNamesById =
				booknames.shortNames;

			plansPubSubService.subscribe(
				PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
				onGetAllSubs,
				SUBSCRIBER_ID
			);
			plansPubSubService.getAllSubs();
		} catch {
			if (mounted) {
				loadState = 'failure';
			}
		}
	}

	function retryInitialize(): void {
		void initialize();
	}

	function onGetAllSubs(
		data: PlansSubscriptionsMessage
	): void {
		const nextSub =
			data.subs.get(subID);

		if (!nextSub) {
			selectedSub = NullSub();
			hasCompletedReading = false;
			visibleReadingEndExclusive = 0;
			scrubberReadingNumber = 1;
			subscriptionMissing = true;
			loadState = 'ready';
			return;
		}

		subscriptionMissing = false;

		const isInitialLoad =
			selectedSub.id.length === 0;

		selectedSub = nextSub;
		setHasCompletedReadings();

		if (isInitialLoad) {
			resetVisibleReadingWindow();
		} else {
			reconcileVisibleReadingWindow();
		}

		loadState = 'ready';
	}

	function resetVisibleReadingWindow(): void {
		visibleReadingEndExclusive =
			firstVisibleReadingIndex;
		scrubberReadingNumber =
			Math.min(
				firstVisibleReadingIndex + 1,
				Math.max(1, selectedSub.nestedReadings.length)
			);
		loadMoreSubReadings();
	}


	/**
	 * Applies refreshed plan data without treating the existing pane as a new
	 * Plan Details view. Worker broadcasts are shared across panes; local
	 * scroll/scrubber state must therefore survive unrelated GET_ALL_SUBS
	 * requests from another mounted Plans view.
	 */
	function reconcileVisibleReadingWindow(): void {
		const totalReadings =
			selectedSub.nestedReadings.length;

		if (totalReadings === 0) {
			visibleReadingEndExclusive = 0;
			scrubberReadingNumber = 1;
			return;
		}

		visibleReadingEndExclusive = Math.min(
			visibleReadingEndExclusive,
			totalReadings
		);

		if (
			visibleReadingEndExclusive <=
			firstVisibleReadingIndex
		) {
			visibleReadingEndExclusive =
				firstVisibleReadingIndex;
			loadMoreSubReadings();
		}

		scrubberReadingNumber = Math.max(
			scrubberMinReadingNumber,
			Math.min(
				scrubberReadingNumber,
				totalReadings
			)
		);
	}

	function loadMoreSubReadings(): void {
		let visibleToAdd = 0;
		let cursor = Math.max(
			visibleReadingEndExclusive,
			firstVisibleReadingIndex
		);

		while (
			visibleToAdd < BATCH_SIZE_TO_SHOW &&
			cursor < selectedSub.nestedReadings.length
		) {
			if (
				showCompletedReadings ||
				!selectedSub.completedReadingIndexes.has(cursor)
			) {
				visibleToAdd++;
			}
			cursor++;
		}

		visibleReadingEndExclusive = cursor;
	}

	/**
	 * Resolves a requested 1-based scrubber value to a visible plan reading and
	 * ensures that reading is rendered. DOM scrolling is owned by the shared
	 * scrubbed viewport.
	 */
	function prepareScrubberValue(
		readingNumber: number
	): number | undefined {
		const targetIndex = resolveVisibleReadingIndex(
			readingNumber - 1
		);

		if (targetIndex === undefined) {
			return undefined;
		}

		visibleReadingEndExclusive = Math.min(
			selectedSub.nestedReadings.length,
			Math.max(
				visibleReadingEndExclusive,
				targetIndex + BATCH_SIZE_TO_SHOW
			)
		);

		return targetIndex + 1;
	}

	function resolveVisibleReadingIndex(
		requestedIndex: number
	): number | undefined {
		const total = selectedSub.nestedReadings.length;
		if (total === 0) {
			return undefined;
		}

		const clamped = Math.max(
			firstVisibleReadingIndex,
			Math.min(requestedIndex, total - 1)
		);

		if (
			showCompletedReadings ||
			!selectedSub.completedReadingIndexes.has(clamped)
		) {
			return clamped;
		}

		for (let index = clamped + 1; index < total; index++) {
			if (!selectedSub.completedReadingIndexes.has(index)) {
				return index;
			}
		}

		for (
			let index = clamped - 1;
			index >= firstVisibleReadingIndex;
			index--
		) {
			if (!selectedSub.completedReadingIndexes.has(index)) {
				return index;
			}
		}

		return undefined;
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

	function onBack(): void {
		navigation.back();
	}

	function onToggleCompletedReadings(): void {
		showCompletedReadings = !showCompletedReadings;
		resetVisibleReadingWindow();
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
	<KJVHeader
		title="Plan Details"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: onBack
		}}
		actions={[
			{
				icon: 'check',
				label: showCompletedReadings
					? 'Hide completed readings'
					: 'Show completed readings',
				onClick: onToggleCompletedReadings,
				disabled: !hasCompletedReading,
				selected: showCompletedReadings
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#if loadState !== 'ready'}
		<PlansLoadState
			state={loadState}
			onRetry={retryInitialize}
			subject="plan readings"
		></PlansLoadState>
	{:else if subscriptionMissing}
		<KJVAsyncState
			message="This plan is no longer in My Plans."
			inset={false}
		></KJVAsyncState>
	{:else}
		{@render subListView(selectedSub)}
	{/if}
{/snippet}

{#snippet subListView(sub: Sub)}
	<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
		<section class="flex shrink-0 min-w-0 flex-col gap-2 py-4">
			<div class="min-w-0">
				<h2 class="truncate text-lg font-semibold text-neutral-700">{sub.name}</h2>
				<div
					class="truncate text-sm text-neutral-500"
					title={sub.publisher}
				>
					Published by {petNameService.resolve(sub.publisher)}
				</div>
			</div>

			{#if sub.description}
				<p class="text-sm text-neutral-600">
					{sub.description}
				</p>
			{/if}

			<div class="text-sm text-neutral-500">
				{sub.percentCompleted}% complete · {sub.completedReadingIndexes.size}
				of {sub.nestedReadings.length} readings
			</div>
		</section>

		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div class="shrink-0 pb-2 text-base text-neutral-700">Readings</div>

			<KJVScrubbedViewport
				min={scrubberMinReadingNumber}
				max={Math.max(1, sub.nestedReadings.length)}
				bind:value={scrubberReadingNumber}
				label="Jump to plan reading"
				{showScrubber}
				formatValue={(readingNumber) => `Reading ${readingNumber}`}
				onReachEnd={loadMoreSubReadings}
				prepareValue={prepareScrubberValue}
			>
				{#if visibleReadingIndexes.length > 0}
					<PlanReadingsList
						readings={sub.nestedReadings}
						readingIndexes={visibleReadingIndexes}
						totalReadings={sub.nestedReadings.length}
						nextReadingIndex={sub.nextReadingsIndex}
						completedReadingIndexes={sub.completedReadingIndexes}
						{verseCountByBookChapter}
						{shortBookNamesById}
						onReadingSelected={onSelectedSubReading}
					></PlanReadingsList>
				{:else if sub.nestedReadings.length > 0}
					<div class="py-4 text-sm text-neutral-500">
						All readings completed.
					</div>
				{/if}
			</KJVScrubbedViewport>
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody ID={subListViewID} {clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
