<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';
	// COMPONENTS
	import SubsAction from './subsAction.svelte';
	import SubsDetails from './subsDetails.svelte';
	import SubsList from './subsList.svelte';

	// MODELS
	import {
		NullSub,
		type Sub,
		type NavReadings,
		PLANS_VIEWS,
		PLAN_PUBSUB_SUBSCRIPTIONS
	} from '$lib/models/plans.model';
	import type { Pane } from '$lib/models/pane.model';

	// SERVICES
	import { completedReadingsService } from '$lib/services/plans/completedReadings.service';
	import { plansPubSubService } from '$lib/services/plans/plansPubSub.service';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================

	let {
		plansDisplay = $bindable<string>(),
		pane = $bindable<Pane>(),
		paneID = $bindable<string>()
	} = $props();

	// ================================== VARS =================================

	let selectedSub: Sub = $state(NullSub());
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
	async function onGetAllSubs(data: any) {
		// TODO add type
		if (data) {
			subsByID = data.subs;
			subs.length = 0;
			subsByID
				.values()
				.toArray()
				.sort((a: any, b: any) => a.dateCreated - b.dateCreated)
				.forEach((s: any) => subs.push(s));

			await processNavReadings();
		}
	}

	/**
	 * Necessary steps after a user completes a {@link Readings}.
	 */
	async function processNavReadings() {
		let nr: NavReadings = pane.buffer.bag?.navReadings;
		if (nr) {
			let cr = completedReadingsService.navReadingsToCompletedReadings(nr);
			await completedReadingsService.save(cr);
			selectedSub = completedReadingsService.updateSubMetadata(
				subsByID,
				nr,
				cr
			);
			completedReadingsService.cleanup(pane);
			completedReadingsService.notifyWorker(cr);
		}
	}
</script>

<!-- ============================== CONTAINER ============================== -->

{#if plansDisplay === PLANS_VIEWS.SUBS_LIST}
	<SubsList
		bind:paneID
		bind:pane
		bind:plansDisplay
		bind:selectedSub
		bind:subsList={subs}
	></SubsList>
{:else if plansDisplay === PLANS_VIEWS.SUBS_ACTIONS}
	<SubsAction bind:plansDisplay bind:pane {paneID}></SubsAction>
{:else if plansDisplay === PLANS_VIEWS.SUBS_DETAILS}
	<SubsDetails {paneID} bind:pane bind:plansDisplay bind:selectedSub
	></SubsDetails>
{/if}
