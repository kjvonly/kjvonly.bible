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
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE,
		type BibleChapterVerseCountLookup
	} from '$lib/domains/bible';

	// COMPONENTS
	import {
		KJVAdaptiveHeaderTitle,
		KJVHeader,
		KJVScrubbedViewport
	} from '$lib/components';
	import PlanReadingsList from '../components/planReadingsList.svelte';
	import {
		subscribeToPlanDefinition
	} from '../runtime/subscribe-to-plan-definition';

	// MODELS
	import {
		NullPlanDefinitionView,
		PLAN_NAVIGATION_RESULTS,
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';
	import {
		parsePlanDefinitionId
	} from '../../../models/plan-definition-id';

	// OTHER
	import uuid4 from 'uuid4';

	const BATCH_SIZE_TO_SHOW = 30;

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
		petNameService,
		planDefinitionsService,
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
		navigationState
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	const planID =
		navigationState.state.planID;

	let selectedPlan: PlanDefinitionView =
		$state(NullPlanDefinitionView());
	let selectedPublisher = $derived(
		selectedPlan.id.length > 0
			? parsePlanDefinitionId(selectedPlan.id).publisher
			: ''
	);
	let selectedPublisherLabel = $derived(
		selectedPublisher.length > 0
			? petNameService.resolve(selectedPublisher)
			: ''
	);

	// ================================== VARS =================================
	let headerHeight: number = $state(0);
	let readingsToShow: number = $state(0);
	let scrubberReadingNumber = $state(1);
	let verseCountByBookChapter =
		$state<BibleChapterVerseCountLookup>({});
	let shortBookNamesById =
		$state<Readonly<Record<string, string>>>({});
	let discoverDetailID = uuid4();

	let visibleReadingIndexes = $derived(
		Array.from(
			{ length: readingsToShow },
			(_, index) => index
		)
	);

	// =============================== LIFECYCLE ===============================
	onMount(() => {
		void loadSelectedPlan();
	});

	// ================================ FUNCS ==================================

	/**
	 * Loads the selected Plan definition using the Resource selections captured
	 * by this navigation entry.
	 */
	async function loadSelectedPlan(): Promise<void> {
		const booknamesSource =
			moduleResourceSelectionResolver
				.require(
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

		verseCountByBookChapter =
			booknames.bookchapterversecountById;
		shortBookNamesById =
			booknames.shortNames;

		selectedPlan = {
			...definition,
			nestedReadings:
				encodedReadingsDecoderService.parseEncodedReadings(
					[...definition.encodedReadings],
					(bookID: string) =>
						booknames.booknamesById[bookID] ?? ''
				)
		};

		readingsToShow = 0;
		scrubberReadingNumber = 1;
		loadMoreReadings();
	}

	function loadMoreReadings(): void {
		readingsToShow = Math.min(
			selectedPlan.nestedReadings.length,
			readingsToShow + BATCH_SIZE_TO_SHOW
		);
	}

	/**
	 * Ensures a scrubber target is rendered before the shared viewport scrolls
	 * to it. The returned value is the 1-based reading number used by the
	 * generic scrubber contract.
	 */
	function prepareScrubberValue(
		readingNumber: number
	): number | undefined {
		if (selectedPlan.nestedReadings.length === 0) {
			return undefined;
		}

		const targetIndex = Math.max(
			0,
			Math.min(
				readingNumber - 1,
				selectedPlan.nestedReadings.length - 1
			)
		);

		readingsToShow = Math.min(
			selectedPlan.nestedReadings.length,
			Math.max(
				readingsToShow,
				targetIndex + BATCH_SIZE_TO_SHOW
			)
		);

		return targetIndex + 1;
	}

	// ============================== CLICK FUNCS ==============================
	async function onAddPlanClicked(): Promise<void> {
		await subscribeToPlanDefinition(
			selectedPlan,
			navigationState,
			application
		);

		toastService.showToast(
			'Plan added to My Plans'
		);

		await navigation.backWithResult({
			type:
				PLAN_NAVIGATION_RESULTS.PLAN_SUBSCRIBED
		});
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
{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle="Plan Preview"
		shortTitle="Preview"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Plan Preview"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: () => navigation.back()
		}}
		{titleContent}
		actions={[
			{
				icon: 'add',
				label: 'Add plan',
				onClick: onAddPlanClicked
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
		<section class="flex shrink-0 min-w-0 flex-col gap-2 py-4">
			<h2 class="text-lg font-semibold text-neutral-700">{selectedPlan.name}</h2>

			{#if selectedPublisherLabel}
				<p class="text-sm text-neutral-500" title={selectedPublisher}>
					Published by {selectedPublisherLabel}
				</p>
			{/if}

			{#if selectedPlan.description}
				<p class="text-sm text-neutral-600">
					{selectedPlan.description}
				</p>
			{/if}
		</section>

		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div class="shrink-0 pb-2 text-base text-neutral-700">Readings</div>

			<KJVScrubbedViewport
				min={1}
				max={Math.max(1, selectedPlan.nestedReadings.length)}
				bind:value={scrubberReadingNumber}
				label="Jump to plan reading"
				showScrubber={selectedPlan.nestedReadings.length > 1}
				formatValue={(readingNumber) => `Reading ${readingNumber}`}
				onReachEnd={loadMoreReadings}
				prepareValue={prepareScrubberValue}
			>
				{#if visibleReadingIndexes.length > 0}
					<PlanReadingsList
						readings={selectedPlan.nestedReadings}
						readingIndexes={visibleReadingIndexes}
						totalReadings={selectedPlan.nestedReadings.length}
						{verseCountByBookChapter}
						{shortBookNamesById}
					></PlanReadingsList>
				{/if}
			</KJVScrubbedViewport>
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody
	ID={discoverDetailID}
	{clientHeight}
	{headerHeight}
	classes="overflow-x-hidden px-4"
>
	{@render body()}
</ViewBody>
