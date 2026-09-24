<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import SubsDetails from './subsDetails.svelte';
	import SubsList from './subsList.svelte';

	// MODELS
	import {
		NullSub,
		type Sub,
		type NavReadings,
		PLANS_VIEWS,
		PLAN_PUBSUB_SUBSCRIPTIONS
	} from '../../../models/plans.model';
	import type { NavigationComponentProps } from '$lib/application';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';

	// SERVICES
	import { useApplicationContext } from '$lib/application';

	// OTHER
	import uuid4 from 'uuid4';

	const {
		planProgressService,
		plansPubSubService,
		workspaceRuntime
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID,
		clientHeight,
		navService
	}: NavigationComponentProps = $props();

	// ================================== VARS =================================

	type SelectedSubNavigationState = {
		selectedSub: Sub;
	} & Record<string, unknown>;

	let selectedSubView: SelectedSubNavigationState = $state({
		selectedSub: NullSub()
	});
	let processingNavReadings: boolean = $state(false);
	let SUBSCRIBER_ID: string = uuid4();
	let subsByID: Map<string, Sub> = new Map<string, Sub>();
	let subs: Sub[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		plansPubSubService.subscribe(
			PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
			onGetAllSubs,
			SUBSCRIBER_ID
		);
		plansPubSubService.getAllSubs();
	});

	onDestroy(() => {
		plansPubSubService.unsubscribe(SUBSCRIBER_ID);
	});

	// ================================ FUNCS ==================================

	/**
	 * Subscription func for getAllSubs. Anytime a sum is changed and published
	 * this function will be called with the updated Subs data
	 *
	 * @param data
	 */
	async function onGetAllSubs(data: PlansSubscriptionsMessage) {
		subsByID = data.subs;
		subs.length = 0;
		subsByID
			.values()
			.toArray()
			.sort((a: Sub, b: Sub) => a.dateSubscribed - b.dateSubscribed)
			.forEach((sub: Sub) => subs.push(sub));

		if (selectedSubView.selectedSub.id) {
			selectedSubView.selectedSub =
				subsByID.get(selectedSubView.selectedSub.id) ??
				selectedSubView.selectedSub;
		}

		await processNavReadings();
	}

	/**
	 * Necessary steps after a user completes a {@link Readings} from a
	 * subscription details view.
	 */
	function onSubSelected(sub: Sub): void {
		selectedSubView.selectedSub = sub;

		navService.push({
			component: SubsDetails,
			obj: selectedSubView
		});
	}

	async function processNavReadings() {
		const buffer = workspaceRuntime.findPane(paneID)?.buffer;
		if (!buffer) {
			return;
		}

		const nr: NavReadings | undefined =
			buffer.bag.navReadings;

		if (
			!nr ||
			nr.returnView !== PLANS_VIEWS.SUBS_DETAILS ||
			processingNavReadings
		) {
			return;
		}

		processingNavReadings = true;
		selectedSubView.selectedSub =
			subsByID.get(nr.subID) ??
			selectedSubView.selectedSub;

		try {
			const progress =
				await planProgressService.completeReading(
					nr.subID,
					nr.subNestedReadingsIndex
				);

			delete buffer.bag.navReadings;

			plansPubSubService.putProgress(
				progress
			);

			navService.push({
				component: SubsDetails,
				obj: selectedSubView
			});
		} finally {
			processingNavReadings = false;
		}
	}

</script>

<!-- ============================== CONTAINER ============================== -->

<SubsList {paneID} {clientHeight} {navService} subsList={subs} {onSubSelected}></SubsList>
