<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// MODELS
	import {
		Modules,
		type NavigationState,
		type NavigationStateValue,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE,
		BIBLE_VIEWS,
		type BibleChapterVerseCountLookup
	} from '$lib/domains/bible';
	import {
		type Sub,
		PLANS_VIEWS,
		PLAN_NAVIGATION_RESULTS,
		PLAN_PUBSUB_SUBSCRIPTIONS
	} from '../../../models/plans.model';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';
	import type { PlansViewLoadState } from '../runtime/plans-view-load-state';

	// COMPONENTS
	import SubsList from './subsList.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';
	import {
		applyPlanReadingNavigationResult
	} from '../runtime/plan-reading-navigation-result';

	// OTHER
	import uuid4 from 'uuid4';

	const application =
		useApplicationContext();

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		planSubscriptionsService,
		planProgressService,
		plansPubSubService
	} = application;

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	const {
		navigationState,
		isActive,
		onResult
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	// ================================== VARS =================================

	const SUBSCRIBER_ID = uuid4();
	let mounted = true;
	let subs: Sub[] = $state([]);
	let verseCountByBookChapter =
		$state<BibleChapterVerseCountLookup>({});
	let shortBookNamesById =
		$state<Readonly<Record<string, string>>>({});
	let selectedReadingSubscriptionID:
		string | undefined;
	let loadState = $state<PlansViewLoadState>('initializing');
	let detachNavigationResult =
		() => {};

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		detachNavigationResult =
			onResult(
				onNavigationResult
			);

		void initialize();
	});

	onDestroy(() => {
		detachNavigationResult();
		mounted = false;
		plansPubSubService.unsubscribe(
			SUBSCRIBER_ID
		);
	});

	// ================================ FUNCS ==================================

	async function initialize(): Promise<void> {
		loadState = 'initializing';
		plansPubSubService.unsubscribe(
			SUBSCRIBER_ID
		);

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

			const [subscriptions, booknames] =
				await Promise.all([
					planSubscriptionsService.list(),
					bibleBooknamesService.get(booknamesSource)
				]);

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

			if (
				subscriptions.length === 0 &&
				isActive()
			) {
				navigation.pushView(
					PLANS_VIEWS.PLANS_LIST,
					{}
				);
			}
		} catch {
			if (mounted) {
				loadState = 'failure';
			}
		}
	}

	function retryInitialize(): void {
		void initialize();
	}

	/**
	 * Subscription func for getAllSubs. Anytime a subscription is changed and
	 * published this function is called with the updated subscription data.
	 */
	function onGetAllSubs(
		data: PlansSubscriptionsMessage
	): void {
		subs.length = 0;
		loadState = 'ready';
		data.subs
			.values()
			.toArray()
			.sort(
				(a: Sub, b: Sub) =>
					a.dateSubscribed -
					b.dateSubscribed
			)
			.forEach(
				(sub: Sub) =>
					subs.push(sub)
			);
	}

	function onSubSelected(
		sub: Sub
	): void {
		navigation.pushView(
			PLANS_VIEWS.SUBS_DETAILS,
			{
				subID: sub.id
			}
		);
	}

	function onNextReadingSelected(
		sub: Sub
	): void {
		const readings =
			sub.nestedReadings[
				sub.nextReadingsIndex
			];

		const firstReading =
			readings?.bcvs[0];

		if (!readings || !firstReading) {
			return;
		}

		selectedReadingSubscriptionID =
			sub.id;

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
					subID: sub.id,
					subNestedReadingsIndex:
						sub.nextReadingsIndex
				}
			}
		);
	}

	async function onNavigationResult(
		result: NavigationStateValue
	): Promise<void> {
		if (
			isRecord(result) &&
			result.type ===
				PLAN_NAVIGATION_RESULTS.READING_COMPLETED
		) {
			if (!selectedReadingSubscriptionID) {
				throw new Error(
					'My Plans reading result received without a selected subscription'
				);
			}

			await applyPlanReadingNavigationResult(
				result,
				selectedReadingSubscriptionID,
				{
					planProgressService,
					plansPubSubService
				}
			);

			selectedReadingSubscriptionID =
				undefined;
			return;
		}
	}

	/**
	 * Validates the navigation contract required by the Plans subscriptions view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is NavigationState<PLANS_VIEWS.SUBS_LIST> {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.SUBS_LIST ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Plans subscriptions navigation state'
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

<!-- ============================== CONTAINER ============================== -->

<SubsList
	subsList={subs}
	{verseCountByBookChapter}
	{shortBookNamesById}
	{loadState}
	onRetryLoad={retryInitialize}
	{onSubSelected}
	{onNextReadingSelected}
></SubsList>
